import assert from 'node:assert/strict';
import { getEditableListings } from '../functions/_dashboard-queries.js';

const ids = Array.from({ length: 217 }, (_, i) => `listing-${i}`);
const calls: number[] = [];
const db = {
  prepare(sql: string) {
    return {
      bind(...values: string[]) {
        return {
          async all() {
            if (sql.includes('FROM franchise_site_publications p')) {
              assert.deepEqual(values.length, 1);
              return { results: ids.map((id) => ({ id, slug: id, brand_name: id })) };
            }
            assert(sql.includes('FROM franchise_locations fl'));
            assert(values.length <= 80, 'D1 location lookup exceeded safe bind count');
            calls.push(values.length);
            return { results: values.map((franchise_id) => ({ franchise_id, location_text: 'Bandung', city: 'Bandung', source_field: 'owner_profile' })) };
          },
        };
      },
    };
  },
};

async function main() {
const listings = await getEditableListings(db as never);
assert.equal(listings.length, ids.length);
assert.deepEqual(calls, [80, 80, 57]);
assert(listings.every((item: { structured_locations: unknown[] }) => item.structured_locations.length === 1));
console.log('217 dashboard listings use three bounded location queries');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });