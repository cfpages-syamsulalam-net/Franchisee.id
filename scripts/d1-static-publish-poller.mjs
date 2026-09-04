#!/usr/bin/env node
/** Shared, deliberately non-transactional D1 queue poller. */
import process from 'node:process';
import fs from 'node:fs';

const REPOS = {
  'cfpages-admtravelbos/Franchisor.id': { site:'site_franchisor_id', project:'franchisor-id', account:'0ba63b7f0096bc267a93fe5c80b1f571', database:'812cd8ac-edd0-45d9-981f-c9a15358317b', hook:'PAGES_DEPLOY_HOOK_FRANCHISOR_ID' },
  'cfpages-syamsulalam-net/Franchisee.id': { site:'site_franchisee_id', project:'franchisee-id', account:'0ba63b7f0096bc267a93fe5c80b1f571', database:'812cd8ac-edd0-45d9-981f-c9a15358317b', hook:'PAGES_DEPLOY_HOOK_FRANCHISEE_ID' }
};
export class PollerError extends Error {}
export class ConflictError extends PollerError {}

function fail(message) { throw new PollerError(message); }
export function validateConfiguration(env = process.env, { requireHook = false } = {}) {
  const repo = env.GITHUB_REPOSITORY, cfg = REPOS[repo];
  if (!cfg) fail('repository is not approved');
  const required = ['GITHUB_REPOSITORY','SITE_ID','PAGES_PROJECT_NAME','TARGET_REF','CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_D1_DATABASE_ID','CLOUDFLARE_API_TOKEN','DEPLOY_HOOK_URL'];
  for (const key of required) if (!env[key]) fail(`missing configuration: ${key}`);
  if (env.SITE_ID !== cfg.site || env.PAGES_PROJECT_NAME !== cfg.project || env.CLOUDFLARE_ACCOUNT_ID !== cfg.account || env.CLOUDFLARE_D1_DATABASE_ID !== cfg.database) fail('configuration does not match repository allowlist');
  if (env.GITHUB_REF_TYPE && env.GITHUB_REF_TYPE !== 'branch') fail('ref must be a branch');
  if (env.GITHUB_DEFAULT_BRANCH && env.TARGET_REF !== env.GITHUB_DEFAULT_BRANCH) fail('ref is not the default branch');
  if (env.GITHUB_REF_NAME && env.TARGET_REF !== env.GITHUB_REF_NAME) fail('target ref mismatch');
  if (!/^[A-Za-z0-9._/-]+$/.test(env.TARGET_REF) || env.TARGET_REF.includes('..')) fail('unsafe target ref');
  if (requireHook && env.DEPLOY_HOOK_URL.includes('\n')) fail('unsafe deploy hook value');
  return cfg;
}

export async function d1Request(env, sql, params = [], fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') fail('fetch is unavailable');
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${env.CLOUDFLARE_D1_DATABASE_ID}/query`;
  let response;
  try { response = await fetchImpl(url, { method:'POST', headers:{'Authorization':`Bearer ${env.CLOUDFLARE_API_TOKEN}`,'Content-Type':'application/json'}, body:JSON.stringify({ sql, params }) }); }
  catch { fail('D1 request failed'); }
  let body; try { body = await response.json(); } catch { fail('malformed D1 response'); }
  if (!response.ok || !body || body.success !== true || !Array.isArray(body.result) || !body.result[0]) fail(`D1 request failed (${response.status || 0})`);
  const first = body.result[0];
  if (first?.result?.[0]) return { ...first.result[0], success: first.success };
  return first?.success === undefined ? { ...first, success: body.success } : first; // retains rows and meta exactly
}

export async function queryD1(env, sql, params = [], fetchImpl = globalThis.fetch) { return d1Request(env, sql, params, fetchImpl); }
export async function mutateD1(env, sql, params = [], fetchImpl = globalThis.fetch) {
  const result = await d1Request(env, sql, params, fetchImpl);
  if (result.success !== true || !result.meta || Number(result.meta.changes) !== 1) throw new ConflictError('compare-and-set conflict');
  return result;
}

function rows(result) { return Array.isArray(result?.results) ? result.results : Array.isArray(result) ? result : []; }
export function selectEligible(state, requests, now = Date.now()) {
  const force = state.force === true;
  if (!force && state.is_enabled === 0) return { requests:[], skip_reason:'disabled' };
  if (!force && Number(state.daily_publish_limit) > 0 && Number(state.published_today || 0) >= Number(state.daily_publish_limit)) return { requests:[], skip_reason:'daily_limit' };
  if (!force && state.last_published_at && Number(state.min_publish_interval_minutes) > 0 && now - Date.parse(state.last_published_at) < Number(state.min_publish_interval_minutes) * 60000) return { requests:[], skip_reason:'interval_limit' };
  return { requests: requests.filter(r => r.status === 'pending' || r.status === 'failed_retryable').sort((a,b) => Number(a.id)-Number(b.id)), skip_reason:'' };
}

export async function claimRequest(env, id, priorStatus, fetchImpl = globalThis.fetch) {
  const sql = `UPDATE site_publish_requests SET status = 'queued', queued_at = CURRENT_TIMESTAMP WHERE id = ? AND site_id = ? AND status = ?`;
  return mutateD1(env, sql, [id, env.SITE_ID, priorStatus], fetchImpl);
}
export async function markDeployed(env = process.env, ids = [], fetchImpl = globalThis.fetch) {
  validateConfiguration(env);
  const unique = [...new Set(ids.map(String))];
  const out = [];
  for (const id of unique) out.push(await mutateD1(env, `UPDATE site_publish_requests SET status = 'deployed', deployed_at = CURRENT_TIMESTAMP WHERE id = ? AND site_id = ? AND status = 'queued'`, [id, env.SITE_ID], fetchImpl));
  return out;
}
export async function markFailed(env = process.env, ids = [], message = 'provider operation failed', fetchImpl = globalThis.fetch) {
  validateConfiguration(env);
  const safe = String(message).replace(/[\r\n\t]+/g,' ').replace(/https?:\/\/\S+/gi,'[redacted]').slice(0,200);
  const out = [];
  for (const id of [...new Set(ids.map(String))]) out.push(await mutateD1(env, `UPDATE site_publish_requests SET status = 'failed_retryable', last_error = ? WHERE id = ? AND site_id = ? AND status = 'queued'`, [safe,id,env.SITE_ID], fetchImpl));
  return out;
}
export async function recoverStaleQueue(env, fetchImpl = globalThis.fetch) {
  validateConfiguration(env);
  return mutateD1(env, `UPDATE site_publish_requests SET status = 'failed_retryable' WHERE site_id = ? AND status = 'queued' AND queued_at < datetime('now', '-' || (SELECT stale_queued_after_minutes FROM site_publish_state WHERE site_id = ?) || ' minutes')`, [env.SITE_ID, env.SITE_ID], fetchImpl);
}
export async function reconcileCounts(env, fetchImpl = globalThis.fetch) {
  validateConfiguration(env);
  return queryD1(env, `SELECT COUNT(*) AS pending_count FROM site_publish_requests WHERE site_id = ? AND status IN ('pending','failed_retryable')`, [env.SITE_ID], fetchImpl);
}

function output(name, value) {
  const text = String(value ?? '').replace(/[\r\n%]/g, c => c === '%' ? '%25' : c === '\r' ? '%0D' : '%0A').replace(/\t/g,'%09');
  const file = process.env.GITHUB_OUTPUT; if (file) fs.appendFileSync(file, `${name}=${text}\n`, 'utf8');
}
export async function run(env = process.env, fetchImpl = globalThis.fetch) {
  const cfg = validateConfiguration(env);
  const force = String(env.FORCE_PUBLISH || 'false').toLowerCase() === 'true';
  const stateResult = await queryD1(env, `SELECT * FROM site_publish_state WHERE site_id = ?`, [env.SITE_ID], fetchImpl);
  const state = rows(stateResult)[0] || { site_id:env.SITE_ID, is_enabled:1, daily_publish_limit:0, min_publish_interval_minutes:0, publish_mode:'hook' };
  state.force = force;
  const reqResult = await queryD1(env, `SELECT id, site_id, status, created_at FROM site_publish_requests WHERE site_id = ? AND status IN ('pending','failed_retryable') ORDER BY id ASC`, [env.SITE_ID], fetchImpl);
  const eligible = selectEligible(state, rows(reqResult));
  const queued = [];
  for (const item of eligible.requests) { await claimRequest(env, item.id, item.status, fetchImpl); queued.push(String(item.id)); }
  const mode = state.publish_mode === 'direct' ? 'direct' : 'hook';
  const should = queued.length > 0;
  if (should && mode === 'hook' && !env.DEPLOY_HOOK_URL) fail('missing configuration: DEPLOY_HOOK_URL');
  output('should_publish', should ? 'true':'false'); output('should_direct_deploy', should && mode === 'direct' ? 'true':'false'); output('should_call_deploy_hook', should && mode === 'hook' ? 'true':'false'); output('site_id', cfg.site); output('pending_count', rows(reqResult).length); output('queued_count', queued.length); output('publish_mode', mode); output('skip_reason', should ? '' : eligible.skip_reason || 'no_change'); output('queued_request_ids', queued.join(','));
  return { should_publish:should, should_direct_deploy:should&&mode==='direct', should_call_deploy_hook:should&&mode==='hook', queued_request_ids:queued, skip_reason:should?'':eligible.skip_reason||'no_change' };
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll('\\','/')}`) {
  const ids = (process.env.QUEUED_REQUEST_IDS || '').split(',').map(x=>x.trim()).filter(Boolean);
  const mode = process.argv[2];
  const task = mode === '--mark-deployed' ? markDeployed(process.env, ids) : mode === '--mark-failed' ? markFailed(process.env, ids, process.env.FAILURE_MESSAGE) : run(process.env);
  task.catch(err => { console.error(`poller failed: ${err instanceof PollerError ? err.message : 'internal error'}`); process.exitCode = 1; });
}
