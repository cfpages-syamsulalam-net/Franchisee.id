import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import { loadDueEmails } from "../functions/_premium-email-worker.js";

const calls: Array<{ sql: string; params: unknown[] }> = [];
const candidateRows = [
  { id: "email_claimed", to_email: "owner@example.com", subject: "A", body_text: "A", body_html: "", category: "premium", attempt_count: 0 },
  { id: "email_raced", to_email: "owner2@example.com", subject: "B", body_text: "B", body_html: "", category: "premium", attempt_count: 1 },
];

const db = {
  prepare(sql: string) {
    return {
      bind(...params: unknown[]) {
        calls.push({ sql, params });
        return {
          async all() {
            assert.match(sql, /locked_at IS NULL OR locked_at <= datetime\('now', \?\)/);
            assert.equal(params[1], "-15 minutes");
            return { results: candidateRows };
          },
          async run() {
            assert.match(sql, /SET locked_at = CURRENT_TIMESTAMP/);
            assert.match(sql, /WHERE id = \?/);
            assert.match(sql, /status IN \('pending', 'failed'\)/);
            assert.match(sql, /next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP/);
            assert.match(sql, /locked_at IS NULL OR locked_at <= datetime\('now', \?\)/);
            assert.equal(params[2], "-15 minutes");
            return { meta: { changes: params[0] === "email_claimed" ? 1 : 0 } };
          },
        };
      },
    };
  },
};

async function main() {
  const rows = await loadDueEmails(db, 20);
  assert.deepEqual(rows.map((row: any) => row.id), ["email_claimed"]);
  assert.equal(calls.length, 3);

  const profilePremium = readFileSync("functions/_profile-premium.js", "utf8");
  assert.match(profilePremium, /o\.status IN \('pending_payment', 'confirmation_submitted'\)/);
  assert.match(profilePremium, /o\.expires_at > CURRENT_TIMESTAMP/);
  assert.match(profilePremium, /WHERE order_id = \? AND review_status = 'pending'/);
  assert.match(profilePremium, /isRenewableSubscription\(active\)/);
  assert.match(profilePremium, /PREMIUM_RENEWAL_WINDOW_DAYS/);

  const dashboardActions = readFileSync("functions/_dashboard-actions.js", "utf8");
  assert.match(dashboardActions, /PREMIUM_CONFIRMATION_ALREADY_REVIEWED/);
  assert.match(dashboardActions, /source_order_id/);
  assert.match(dashboardActions, /premium.payment.approve/);

  const premiumLifecycle = readFileSync("functions/_premium-lifecycle.js", "utf8");
  assert.match(premiumLifecycle, /expirePremiumAfterGrace/);
  assert.match(premiumLifecycle, /premium_grace_expired/);
  assert.match(premiumLifecycle, /siteRebuildStatements/);
  assert.match(premiumLifecycle, /publication_status = 'hidden'/);

  console.log("Premium lifecycle email queue lock check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
