#!/usr/bin/env node

import { appendFileSync } from "node:fs";

const DEFAULT_SITE_ID = "site_franchisee_id";
const DEFAULT_DATABASE_ID = "812cd8ac-edd0-45d9-981f-c9a15358317b";

const args = new Set(process.argv.slice(2));
const siteId = process.env.SITE_ID || DEFAULT_SITE_ID;
const forcePublish = process.env.FORCE_PUBLISH === "true" || args.has("--force");
const command = args.has("--mark-deployed")
  ? "mark-deployed"
  : args.has("--mark-failed")
    ? "mark-failed"
    : "poll";

try {
  if (command === "mark-deployed") {
    await markDeployed();
  } else if (command === "mark-failed") {
    await markFailed(process.env.FAILURE_MESSAGE || "Direct GitHub deploy failed.");
  } else {
    await pollAndMaybePublish();
  }
} catch (error) {
  console.error(error);
  setOutput("should_publish", "false");
  setOutput("error", error.message || "UNKNOWN_ERROR");
  process.exit(1);
}

async function pollAndMaybePublish() {
  await expireStaleQueuedRequests();

  const state = await first(
    `SELECT site_id, publish_mode, is_enabled, last_publish_triggered_at,
            daily_publish_count, daily_publish_date, daily_publish_limit,
            min_publish_interval_minutes
     FROM site_publish_state
     WHERE site_id = ?`,
    [siteId]
  );

  if (!state) {
    throw new Error(`Missing site_publish_state row for ${siteId}. Apply migrations first.`);
  }

  const counts = await first(
    `SELECT
       SUM(CASE WHEN status IN ('pending', 'failed_retryable') THEN 1 ELSE 0 END) AS pending_count,
       SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued_count
     FROM site_rebuild_requests
     WHERE site_id = ?`,
    [siteId]
  );

  const pendingCount = Number(counts?.pending_count || 0);
  const queuedCount = Number(counts?.queued_count || 0);
  await recalculateStateCounts();

  setOutput("site_id", siteId);
  setOutput("pending_count", String(pendingCount));
  setOutput("queued_count", String(queuedCount));
  setOutput("publish_mode", state.publish_mode || "cloudflare_deploy_hook");

  if (!pendingCount && !forcePublish) {
    console.log(`No pending D1 publish work for ${siteId}.`);
    setOutput("should_publish", "false");
    setOutput("skip_reason", "clean");
    return;
  }

  if (!forcePublish && Number(state.is_enabled) !== 1) {
    console.log(`Publishing is disabled for ${siteId}.`);
    setOutput("should_publish", "false");
    setOutput("skip_reason", "disabled");
    return;
  }

  const guardrail = evaluateGuardrails(state);
  if (!forcePublish && !guardrail.allowed) {
    console.log(`Publish skipped for ${siteId}: ${guardrail.reason}`);
    setOutput("should_publish", "false");
    setOutput("skip_reason", guardrail.reason);
    return;
  }

  const publishMode = state.publish_mode || "cloudflare_deploy_hook";
  setOutput("should_publish", "true");

  if (publishMode === "github_direct_deploy") {
    await markPendingAsQueued();
    await recordPublishTrigger(state);
    console.log(`D1 is dirty for ${siteId}; direct GitHub deploy requested.`);
    setOutput("should_direct_deploy", "true");
    setOutput("should_call_deploy_hook", "false");
    return;
  }

  console.log(`D1 is dirty for ${siteId}; calling Cloudflare Pages Deploy Hook.`);
  await callDeployHook();
  await markPendingAsQueued();
  await recordPublishTrigger(state);
  setOutput("should_direct_deploy", "false");
  setOutput("should_call_deploy_hook", "true");
}

async function expireStaleQueuedRequests() {
  await run(
    `UPDATE site_rebuild_requests
     SET status = 'failed_retryable',
         failed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP,
         error_message = 'Queued publish did not report completion before stale timeout.'
     WHERE site_id = ?
       AND status = 'queued'
       AND queued_at <= datetime(
         'now',
         '-' || COALESCE(
           (SELECT stale_queued_after_minutes FROM site_publish_state WHERE site_id = ?),
           120
         ) || ' minutes'
       )`,
    [siteId, siteId]
  );
}

async function markPendingAsQueued() {
  await run(
    `UPDATE site_rebuild_requests
     SET status = 'queued',
         queued_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP,
         error_message = NULL
     WHERE site_id = ?
       AND status IN ('pending', 'failed_retryable')`,
    [siteId]
  );
}

async function recordPublishTrigger(state) {
  const today = utcDate();
  const currentCount = state.daily_publish_date === today ? Number(state.daily_publish_count || 0) : 0;
  await run(
    `UPDATE site_publish_state
     SET last_publish_triggered_at = CURRENT_TIMESTAMP,
         daily_publish_count = ?,
         daily_publish_date = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE site_id = ?`,
    [currentCount + 1, today, siteId]
  );
  await recalculateStateCounts();
}

async function markDeployed() {
  await run(
    `UPDATE site_rebuild_requests
     SET status = 'deployed',
         deployed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE site_id = ?
       AND status = 'queued'`,
    [siteId]
  );
  await run(
    `UPDATE site_publish_state
     SET dirty_since = NULL,
         last_published_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE site_id = ?`,
    [siteId]
  );
  await recalculateStateCounts();
  setOutput("marked_deployed", "true");
}

async function markFailed(message) {
  await run(
    `UPDATE site_rebuild_requests
     SET status = 'failed_retryable',
         failed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP,
         error_message = ?
     WHERE site_id = ?
       AND status = 'queued'`,
    [message.slice(0, 500), siteId]
  );
  await run(
    `UPDATE site_publish_state
     SET dirty_since = COALESCE(dirty_since, CURRENT_TIMESTAMP),
         updated_at = CURRENT_TIMESTAMP
     WHERE site_id = ?`,
    [siteId]
  );
  await recalculateStateCounts();
  setOutput("marked_failed", "true");
}

async function recalculateStateCounts() {
  await run(
    `UPDATE site_publish_state
     SET pending_count = (
           SELECT COUNT(*) FROM site_rebuild_requests
           WHERE site_id = ? AND status IN ('pending', 'failed_retryable')
         ),
         queued_count = (
           SELECT COUNT(*) FROM site_rebuild_requests
           WHERE site_id = ? AND status = 'queued'
         ),
         dirty_since = CASE
           WHEN (
             SELECT COUNT(*) FROM site_rebuild_requests
             WHERE site_id = ? AND status IN ('pending', 'failed_retryable')
           ) = 0 THEN dirty_since
           ELSE COALESCE(dirty_since, CURRENT_TIMESTAMP)
         END,
         updated_at = CURRENT_TIMESTAMP
     WHERE site_id = ?`,
    [siteId, siteId, siteId, siteId]
  );
}

function evaluateGuardrails(state) {
  const today = utcDate();
  const dailyLimit = Number(state.daily_publish_limit || 12);
  const dailyCount = state.daily_publish_date === today ? Number(state.daily_publish_count || 0) : 0;
  if (dailyCount >= dailyLimit) {
    return { allowed: false, reason: "daily_limit_reached" };
  }

  const minIntervalMinutes = Number(state.min_publish_interval_minutes || 30);
  const lastTriggeredAt = state.last_publish_triggered_at ? Date.parse(`${state.last_publish_triggered_at}Z`) : 0;
  if (lastTriggeredAt) {
    const elapsedMinutes = (Date.now() - lastTriggeredAt) / 60000;
    if (elapsedMinutes < minIntervalMinutes) {
      return { allowed: false, reason: "min_interval_active" };
    }
  }

  return { allowed: true };
}

async function callDeployHook() {
  const url = process.env.PAGES_DEPLOY_HOOK_FRANCHISEE_ID;
  if (!url) {
    throw new Error("Missing PAGES_DEPLOY_HOOK_FRANCHISEE_ID secret containing the full Cloudflare Pages Deploy Hook URL.");
  }

  const response = await fetch(url, { method: "POST" });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Deploy hook failed with ${response.status}: ${text.slice(0, 500)}`);
  }

  console.log(`Deploy hook accepted: ${response.status}`);
}

async function first(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  await query(sql, params);
}

async function query(sql, params = []) {
  const accountId = requiredEnv("CLOUDFLARE_ACCOUNT_ID");
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || DEFAULT_DATABASE_ID;
  const token = requiredEnv("CLOUDFLARE_API_TOKEN");
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    const message = payload?.errors?.map((error) => error.message).join("; ") || response.statusText;
    throw new Error(`D1 query failed: ${message}`);
  }

  const result = Array.isArray(payload.result) ? payload.result[0] : payload.result;
  return result?.results || [];
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function utcDate() {
  return new Date().toISOString().slice(0, 10);
}

function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    const line = `${name}=${String(value).replace(/\r?\n/g, " ")}\n`;
    appendFileSync(process.env.GITHUB_OUTPUT, line);
  }
  console.log(`${name}=${value}`);
}
