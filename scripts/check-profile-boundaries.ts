import assert from 'node:assert/strict';
import { loadProfileData } from '../functions/_profile-read-model.js';
import { onRequestPut } from '../functions/profile-data.js';

async function main() {
  const denied = await onRequestPut();
  assert.equal(denied.status, 405);
  const db = {
    prepare() {
      return {
        bind() { return this; },
        async first() { return null; },
        async all() { return { results: [] }; },
      };
    },
  };
  const payload = await loadProfileData(db as never, { id: 'buyer-fixture', email: 'buyer@example.invalid', roles: ['franchisee'], status: 'active' } as never);
  for (const field of ['user', 'completion', 'franchisee_profile', 'franchisor_profile', 'owned_franchises', 'claims', 'saved_opportunities', 'inquiry_history', 'franchisor_leads', 'premium_membership']) {
    assert(Object.hasOwn(payload, field), `Profile GET read model lost ${field}`);
  }
  assert.deepEqual(payload.owned_franchises, []);
  assert.deepEqual(payload.saved_opportunities, []);
  console.log('Profile module preserves allowed methods and GET response keys');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });