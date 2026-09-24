import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/brand-match.js';

const rows = [
  { brand_name: 'Kopi Test', category: 'Minuman', city_origin: 'Bogor', source_sheet: 'UNCLAIMED', status: 'unclaimed', id: 'listing-1', owner_user_id: null, legacy_row_id: 'old-1', public_slug: 'kopi-test', pic_name: 'PRIVATE', public_phone: 'PRIVATE', claim_pending: 0, claim_approved: 0 },
  { brand_name: 'Kopi Test', source_sheet: 'UNCLAIMED', status: 'unclaimed', id: 'listing-2', owner_user_id: null, legacy_row_id: 'old-2', public_slug: 'kopi-test-2', claim_pending: 1, claim_approved: 0 },
  { brand_name: 'Kopi Test', source_sheet: 'FRANCHISOR', status: 'free', owner_user_id: 'account-1', public_slug: 'kopi-test-3', pic_name: 'Approved PIC', public_phone: '0812345678', claim_pending: 0, claim_approved: 1, raw_payload: 'PRIVATE' },
  { brand_name: 'Kopi Test', source_sheet: 'FRANCHISOR', status: 'free', owner_user_id: 'account-2', public_slug: 'kopi-test-4', pic_name: 'Unreviewed PIC', public_phone: '0898765432', claim_pending: 0, claim_approved: 0 },
  { brand_name: 'Kopi Test', source_sheet: 'FRANCHISOR', status: 'free', owner_user_id: 'account-3', public_slug: '../../unsafe', pic_name: 'Unpublished PIC', public_phone: '088888888', claim_pending: 0, claim_approved: 1 },
  { brand_name: 'Kopi Test', source_sheet: 'FRANCHISOR', status: 'pending_review', id: 'new-application',
    owner_user_id: null, public_slug: null, pic_name: 'Pending PRIVATE', public_phone: '0888000', claim_pending: 0, claim_approved: 0 },
];
const db = { prepare(sql: string) { assert.match(sql, /LOWER\(TRIM\(f\.brand_name\)\)/); return { bind(site: string, name: string) {
  assert.equal(site, 'site_franchisee_id'); assert.equal(name, 'Kopi Test');
  return { async all() { return { results: rows }; } };
} }; } };
async function get(name: string, database: unknown = db) {
  const response = await onRequestGet({ request: new Request('https://franchisee.id/brand-match?name=' + encodeURIComponent(name)), env: { franchise_db: database } } as never);
  return { response, body: await response.json() as { success: boolean; matches: Record<string, unknown>[] } };
}
async function main() {
  assert.equal((await get('a')).response.status, 400);
  assert.equal((await get('Kopi Test', null)).response.status, 503);
  assert.equal((await get('Kopi Test', { prepare() { throw new Error('private database error'); } })).response.status, 503);
  const { response, body } = await get('  Kopi Test  ');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(body.matches.length, rows.length);
  assert.equal(body.matches[0].claim_id, 'listing-1');
  assert.equal(body.matches[0].state, 'unclaimed');
  assert.equal(body.matches[0].contact_person, null);
  assert.equal(body.matches[1].claim_id, null);
  assert.equal(body.matches[1].claim_pending, true);
  assert.equal(body.matches[2].state, 'managed');
  assert.equal(body.matches[2].ownership_confirmed, true);
  assert.equal(body.matches[2].contact_person, 'Approved PIC');
  assert.equal(body.matches[2].contact_phone, '0812345678');
  assert.equal(body.matches[3].contact_person, null);
  assert.equal(body.matches[3].contact_phone, null);
  assert.equal(body.matches[4].public_url, null);
  assert.equal(body.matches[4].contact_person, null);
  assert.equal(body.matches[5].state, 'pending_review');
  assert.equal(body.matches[5].claim_id, null);
  assert.equal(body.matches[5].public_url, null);
  assert.equal(body.matches[5].contact_person, null);
  assert.equal(body.matches[5].contact_phone, null);
  const json = JSON.stringify(body);
  assert(!json.includes('account-1') && !json.includes('raw_payload') && !json.includes('PRIVATE'));
  console.log('brand match public projection and claim choices passed');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
