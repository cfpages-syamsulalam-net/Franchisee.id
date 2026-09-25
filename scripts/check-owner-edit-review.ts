import assert from 'node:assert/strict';
import { OWNER_REVIEW_REASON, queueOwnerReview, reviewedProfileStatements } from '../functions/_profile-owner-review.js';

async function main() {
const state: { pending: null | Record<string, unknown>; inserted: Array<{ sql: string; values: unknown[] }>; updated: unknown[] | null; shared: boolean } = {
  pending: null, inserted: [], updated: null, shared: false,
};
const db = { prepare(sql: string) { return { sql, values: [] as unknown[], bind(...values: unknown[]) {
  this.values = values; return this;
}, async first() {
  if (sql.includes('SELECT id, old_value, suggested_value FROM listing_edit_suggestions')) return state.pending;
  if (sql.includes('SELECT fp.* FROM franchisor_profiles')) return {
    id: 'profile-1', whatsapp: 'old-phone', website_url: 'https://old.invalid',
  };
  if (sql.includes('SELECT COUNT(*) AS total FROM franchises')) return { total: state.shared && !sql.includes('AND f.owner_user_id = ?') ? 2 : 1 };
  throw new Error('Unrecognised first query: ' + sql);
}, async all() { return { results: [{ id: 'listing-1' }] }; },
async run() { state.updated = this.values; return { meta: { changes: 1 } }; },
}; }, async batch(statements: Array<{ sql: string; values: unknown[] }>) {
  state.inserted = statements; return statements.map(() => ({ meta: { changes: 1 } }));
} };
const actor = { id: 'owner-1' };
const queued = await queueOwnerReview(db as never, actor, 'listing-1', { phone: 'new-phone' }, { phone: 'old-phone' }, 'json_diff');
assert.equal(queued.pending, true);
assert.equal(state.inserted.filter((item) => item.sql.includes('INSERT INTO listing_edit_suggestions')).length, 1);
assert.equal(state.inserted[0].values[4], 'json_diff');
assert.equal(state.inserted[0].values[7], OWNER_REVIEW_REASON);
assert(!state.inserted.some((item) => item.sql.includes('UPDATE franchises')));
state.pending = { id: 'pending-1', old_value: JSON.stringify({ phone: 'old-phone' }), suggested_value: JSON.stringify({ phone: 'new-phone' }) };
const merged = await queueOwnerReview(db as never, actor, 'listing-1', { cover_url: 'https://assets.invalid/new' }, { cover_url: null }, 'json_diff');
assert.equal(merged.existing, true);
assert.equal(state.updated, null);
const suggestion = { id: 'pending-1', franchise_id: 'listing-1', suggested_by_user_id: 'owner-1', old_value: JSON.stringify({ profile_whatsapp: 'old-phone' }) };
const statements = await reviewedProfileStatements(db as never, suggestion, { profile_whatsapp: 'new-phone' }, 'admin-1');
assert(statements?.some((item: { sql: string }) => item.sql.includes('UPDATE franchisor_profiles')));
assert(statements?.some((item: { sql: string }) => item.sql.includes('site_rebuild_requests')));
state.shared = true;
assert.equal(await reviewedProfileStatements(db as never, suggestion, { profile_whatsapp: 'new-phone' }, 'admin-1'), null);
await assert.rejects(() => reviewedProfileStatements(db as never, suggestion, { profile_owner_user_id: 'attacker' }, 'admin-1'));
console.log('Owner changes queue private review and profile approval validates ownership');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
