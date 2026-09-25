import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import { loadDueEmails } from "../functions/_premium-email-worker.js";
// @ts-ignore Pages Functions are JavaScript modules without generated declarations.
import { expirePremiumAfterGrace } from "../functions/_premium-lifecycle.js";

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

  await checkPremiumRenewalInterleaving();

  console.log("Premium lifecycle checks passed, including renewal interleaving.");
}

async function checkPremiumRenewalInterleaving() {
  const expiredRow = {
    id: "old_subscription",
    franchise_id: "franchise_1",
    user_id: "user_1",
    ends_at: "2026-01-01 00:00:00",
    brand_name: "Test Franchise",
    slug: "test-franchise",
  };
  let replacementExists = false;
  let tier: "premium" | "free" = "premium";
  let publication: "published" | "hidden" = "published";
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          const statement = { sql, params };
          statements.push(statement);
          return {
            ...statement,
            async all() {
              return { results: [expiredRow] };
            },
          };
        },
      };
    },
    async batch(batchStatements: Array<{ sql: string; params: unknown[] }>) {
      // The renewal lands after candidate selection and immediately before the atomic batch.
      replacementExists = true;
      const downgrade = batchStatements.find((statement) => statement.sql.includes("UPDATE franchises"));
      const hide = batchStatements.find((statement) => statement.sql.includes("UPDATE franchise_site_publications"));
      assert.ok(downgrade);
      assert.ok(hide);
      for (const statement of [downgrade, hide]) {
        assert.match(statement.sql, /NOT EXISTS\s*\(\s*SELECT 1 FROM franchise_subscriptions/);
        assert.match(statement.sql, /status = 'active' AND ends_at > CURRENT_TIMESTAMP/);
        if (!replacementExists) {
          if (statement === downgrade) tier = "free";
          else publication = "hidden";
        }
      }
      assert.equal(replacementExists, true);
    },
  };

  // This is the previous check-then-batch behavior: the stale result permits both writes.
  let legacyTier: "premium" | "free" = "premium";
  let legacyPublication: "published" | "hidden" = "published";
  const staleHasReplacement = false;
  replacementExists = true;
  if (!staleHasReplacement) {
    legacyTier = "free";
    legacyPublication = "hidden";
  }
  assert.equal(legacyTier, "free");
  assert.equal(legacyPublication, "hidden");
  replacementExists = false;

  assert.equal(await expirePremiumAfterGrace(db, { grace_period_days: 0 } as any), 1);
  assert.equal(tier, "premium");
  assert.equal(publication, "published");
  assert.equal(statements.some((statement) => statement.sql.includes("UPDATE franchises")), true);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
