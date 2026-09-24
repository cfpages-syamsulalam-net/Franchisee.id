import assert from "node:assert/strict";
import { handleReviewBrandSubmission, handleUpdatePublication } from "../functions/_dashboard-actions.js";

const admin = { id: "admin", roles: [{ role: "admin" }] };
const staff = { id: "staff", roles: [{ role: "staff" }] };
const state = { reviewStatus: "pending", franchiseStatus: "pending_review", owner: null as string | null, publicationStatus: "draft", queued: false };
const db = {
  prepare(sql: string) {
    return {
      sql,
      values: [] as unknown[],
      bind(...values: unknown[]) { this.values = values; return this; },
      async first() {
        if (sql.includes("FROM franchise_submission_reviews r")) return {
          id: "review-1", franchise_id: "listing-1", applicant_user_id: "applicant",
          status: state.reviewStatus, brand_name: "Sample Brand", franchise_status: state.franchiseStatus,
          owner_user_id: state.owner, publication_id: "publication-1", publication_status: state.publicationStatus,
        };
        if (sql.includes("FROM franchise_site_publications p")) return {
          id: "publication-1", franchise_id: "listing-1", brand_name: "Sample Brand",
          publication_status: state.publicationStatus, brand_review_status: state.reviewStatus,
        };
        throw new Error("Unknown review query: " + sql);
      },
    };
  },
  async batch(statements: Array<{ sql: string; values: unknown[] }>) {
    for (const statement of statements) {
      const sql = statement.sql;
      if (sql.includes("UPDATE franchise_submission_reviews")) state.reviewStatus = statement.values[0] as string;
      if (sql.includes("UPDATE franchises SET status = 'free'")) { state.franchiseStatus = "free"; state.owner = statement.values[0] as string; }
if (sql.includes("UPDATE franchises SET status = 'archived'")) state.franchiseStatus = "archived";
      if (sql.includes("UPDATE franchise_site_publications")) state.publicationStatus = "published";
      if (sql.includes("site_rebuild_requests")) state.queued = true;
    }
    return statements.map(() => ({ meta: { changes: 1 } }));
  },
};
const response = async (promise: Promise<Response>) => { const result = await promise; return { code: result.status, body: await result.json() as Record<string, unknown> }; };

async function run() {
  await assert.rejects(() => handleReviewBrandSubmission(db as never, staff as never, { review_id: "review-1", decision: "approve", notes: "claim" }));
  assert.equal((await response(handleReviewBrandSubmission(db as never, admin as never, { review_id: "review-1", decision: "approve", notes: "" }))).code, 400);
  assert.equal((await response(handleUpdatePublication(db as never, admin as never, { franchise_id: "listing-1", site_id: "site_franchisee_id", publication_status: "published" }))).body.error, "BRAND_REVIEW_REQUIRED");
  assert.equal((await response(handleReviewBrandSubmission(db as never, admin as never, { review_id: "review-1", decision: "reject", notes: "No independent proof" }))).body.status, "rejected");
  assert.equal(state.owner, null);
  assert.equal(state.franchiseStatus, "archived");
  assert.equal(state.publicationStatus, "draft");
  assert.equal(state.queued, false);
  assert.equal((await response(handleReviewBrandSubmission(db as never, admin as never, { review_id: "review-1", decision: "approve", notes: "Late evidence" }))).code, 409);
  Object.assign(state, { reviewStatus: "pending", franchiseStatus: "pending_review", owner: null, publicationStatus: "draft", queued: false });
  assert.equal((await response(handleReviewBrandSubmission(db as never, admin as never, { review_id: "review-1", decision: "approve", notes: "Verified on brand-controlled channel" }))).body.status, "approved");
  assert.equal(state.owner, "applicant");
  assert.equal(state.franchiseStatus, "free");
  assert.equal(state.publicationStatus, "published");
  assert.equal(state.queued, true);
  assert.equal((await response(handleReviewBrandSubmission(db as never, admin as never, { review_id: "review-1", decision: "reject", notes: "Try reversing" }))).code, 409);
  console.log("new-brand admin review transitions passed");
}
run().catch((error) => { console.error(error); process.exitCode = 1; });