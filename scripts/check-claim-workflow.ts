import assert from 'node:assert/strict';
import { handleFranchisorSubmit } from '../functions/_form-submit-franchisor.js';
import { handleReviewClaim } from '../functions/_dashboard-actions.js';

const actor = { id: 'applicant', roles: [{ role: 'franchisor' }] };
const admin = { id: 'reviewer', roles: [{ role: 'admin' }] };
const data = { form_type: 'claim', unclaimed_id: 'legacy-1', brand_name: 'Sample Brand', email_contact: 'owner@example.test', whatsapp: '08123456789', company_name: 'PT Sample', pic_name: 'Person' };
function database() {
  const state = { owner: null, listingStatus: 'unclaimed', claimStatus: null, profile: null, queued: false, sourceSheet: 'UNCLAIMED' };
  const db = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            sql, values,
            async first() {
              if (sql.includes('SELECT email_contact') || sql.includes('SELECT slug FROM franchises')) return null;
              if (sql.includes('SELECT id, slug FROM franchises')) return state.owner === null && state.listingStatus === 'unclaimed' && values[0] === 'legacy-1' && values[1] === 'Sample Brand' ? { id: 'listing-1', slug: 'sample-brand' } : null;
              if (sql.includes('SELECT id FROM franchise_claims')) return state.claimStatus === 'pending' ? { id: 'claim-1' } : null;
              if (sql.includes('SELECT fc.*')) return state.claimStatus ? { id: 'claim-1', franchise_id: 'listing-1', claimant_user_id: 'applicant', franchisor_profile_id: state.profile, status: state.claimStatus, owner_user_id: state.owner, franchise_status: state.listingStatus, source_sheet: state.sourceSheet } : null;
              throw new Error('Unknown query: ' + sql);
            },
            async all() { return { results: [] }; }
          };
        }
      };
    },
    async batch(statements) {
      const sql = statements.map(x => x.sql);
      if (sql.some(x => x.includes('INSERT INTO franchise_claims'))) {
        assert.equal(statements.length, 2, 'claim submit only stores the private profile and claim');
        assert.match(sql[1], /status = 'unclaimed'/);
        assert.match(sql[1], /NOT EXISTS/);
        state.profile = statements[0].values[0];
        state.claimStatus = 'pending';
        return [{ meta: { changes: 1 } }, { meta: { changes: 1 } }];
      }
      if (sql.some(x => x.includes('INSERT INTO franchises'))) {
        assert(sql.some(x => x.includes('franchise_site_publications')), 'new brand still creates its publication');
        assert(sql.some(x => x.includes('site_rebuild_requests')), 'new brand still queues publication');
        return statements.map(() => ({ meta: { changes: 1 } }));
      }
      const approval = sql.some(x => x.includes('UPDATE franchises'));
      if (approval) {
        assert.match(sql.find(x => x.includes('UPDATE franchises'))!, /owner_user_id IS NULL AND status = 'unclaimed'/);
        if (state.owner !== null) throw new Error('claim_target_not_unclaimed');
        state.owner = 'applicant'; state.listingStatus = 'free'; state.sourceSheet = 'FRANCHISOR'; state.queued = sql.some(x => x.includes('site_rebuild_requests'));
      }
      state.claimStatus = approval ? 'approved' : 'rejected';
      return statements.map((_, i) => ({ meta: { changes: i === 0 || (approval && i === 2) ? 1 : 0 } }));
    }
  };
  return { db, state };
}
async function response(value: Promise<Response>) { const r = await value; return { code: r.status, body: await r.json() as Record<string, unknown> }; }
async function main() {
  const { db, state } = database();
  assert.equal((await response(handleFranchisorSubmit(db as never, { ...data, form_type: 'FRANCHISOR' }, false, actor as never))).body.success, true);
  assert.equal((await response(handleFranchisorSubmit(db as never, { ...data, unclaimed_id: 'wrong' }, true, actor as never))).code, 409);
  assert.equal(state.claimStatus, null);
  const submitted = await response(handleFranchisorSubmit(db as never, data, true, actor as never));
  assert.equal(submitted.body.status, 'pending');
  assert.equal(state.owner, null); assert.equal(state.listingStatus, 'unclaimed'); assert.equal(state.queued, false);
  assert.equal((await response(handleFranchisorSubmit(db as never, data, true, actor as never))).code, 409);
  assert.equal((await response(handleReviewClaim(db as never, admin as never, { claim_id: 'claim-1', decision: 'approve', notes: '' }))).code, 400);
  assert.equal(state.owner, null);
  assert.equal((await response(handleReviewClaim(db as never, admin as never, { claim_id: 'claim-1', decision: 'reject', notes: 'Applicant could not prove authority' }))).body.status, 'rejected');
  assert.equal(state.owner, null); assert.equal(state.queued, false);
  state.claimStatus = 'pending'; state.owner = 'someone-else';
  assert.equal((await response(handleReviewClaim(db as never, admin as never, { claim_id: 'claim-1', decision: 'approve', notes: 'Verified independent channel' }))).code, 409);
  assert.equal(state.claimStatus, 'pending');
  state.owner = null;
  assert.equal((await response(handleReviewClaim(db as never, admin as never, { claim_id: 'claim-1', decision: 'approve', notes: 'Verified independent channel' }))).body.status, 'approved');
  assert.equal(state.owner, 'applicant'); assert.equal(state.queued, true);
  assert.equal((await response(handleReviewClaim(db as never, admin as never, { claim_id: 'claim-1', decision: 'approve', notes: 'Again' }))).code, 409);
  console.log('claim submission/review transitions passed');
}
main().catch(err => { console.error(err); process.exitCode = 1; });
