import { assertAdmin, auditStatement, jsonResponse } from "./_dashboard-utils.js";

const APPLIED_MIGRATIONS = [
  [24, "0024_ocr_batch_pause_statuses.sql"],
  [25, "0025_ocr_batch_scheduler_timing.sql"],
  [26, "0026_ocr_no_text_status.sql"],
  [27, "0027_ocr_run_leases.sql"],
  [28, "0028_franchisor_progressive_fields.sql"],
  [29, "0029_ocr_provider_actual_limits.sql"],
  [30, "0030_listing_outreach_statuses.sql"],
  [31, "0031_ocr_text_r2_storage.sql"],
  [32, "0032_sales_outreach_workflow_fields.sql"],
];

const MIGRATION_CHECKS = [
  [24, "SELECT COUNT(*) AS ok FROM sqlite_master WHERE type = 'index' AND name = 'idx_ocr_batch_runs_status_created'"],
  [25, "SELECT COUNT(*) AS ok FROM pragma_table_info('ocr_batch_runs') WHERE name = 'scheduler_trigger_due_at'"],
  [26, "SELECT COUNT(*) AS ok FROM sqlite_master WHERE type = 'index' AND name = 'idx_ocr_jobs_batch_status'"],
  [27, "SELECT COUNT(*) AS ok FROM sqlite_master WHERE type = 'table' AND name = 'ocr_run_leases'"],
  [28, "SELECT COUNT(*) AS ok FROM pragma_table_info('franchises') WHERE name = 'min_area_sqm'"],
  [29, "SELECT COUNT(*) AS ok FROM ocr_provider_configs WHERE provider_key = 'ocr_space' AND free_quota_limit = 500 AND free_quota_period = 'daily'"],
  [30, "SELECT COUNT(*) AS ok FROM sqlite_master WHERE type = 'table' AND name = 'listing_outreach_statuses'"],
  [31, "SELECT COUNT(*) AS ok FROM pragma_table_info('franchise_asset_knowledge') WHERE name = 'source_text_r2_key'"],
  [32, "SELECT COUNT(*) AS ok FROM pragma_table_info('listing_outreach_statuses') WHERE name = 'next_follow_up_at'"],
];

export async function handleReconcileD1MigrationLedger(db, auth) {
  assertAdmin(auth);
  const missingSchema = await verifyAppliedMigrationSchema(db);
  if (missingSchema.length) {
    return jsonResponse({
      success: false,
      missing_schema: missingSchema,
      message: "Sebagian migrasi belum terbukti aktif di database. Jalankan migrasi tersebut sebelum menyelaraskan ledger.",
    }, { status: 409 });
  }

  const statements = APPLIED_MIGRATIONS.map(([id, name]) => db
    .prepare("INSERT OR IGNORE INTO d1_migrations (id, name) VALUES (?, ?)")
    .bind(id, name));
  statements.push(auditStatement(db, "dashboard.d1_migrations.reconcile", "d1_migrations", "24-32", {
    ids: APPLIED_MIGRATIONS.map(([id]) => id),
  }, auth.id));
  await db.batch(statements);
  const result = await db
    .prepare("SELECT id, name, applied_at FROM d1_migrations WHERE id >= 24 ORDER BY id")
    .all();
  const missingLedger = await missingMigrationLedgerRows(db);
  return jsonResponse({
    success: true,
    migrations: result.results || [],
    missing_ledger_ids: missingLedger,
    message: missingLedger.length
      ? "Ledger migrasi D1 diselaraskan untuk 0024 sampai 0032, tetapi masih ada migrasi lama yang belum tercatat."
      : "Ledger migrasi D1 sudah lengkap sampai migrasi terbaru.",
  });
}

async function verifyAppliedMigrationSchema(db) {
  const missing = [];
  for (const [id, sql] of MIGRATION_CHECKS) {
    const row = await db.prepare(sql).first();
    if (!Number(row?.ok || 0)) missing.push(id);
  }
  return missing;
}

async function missingMigrationLedgerRows(db) {
  const rows = await db.prepare("SELECT id FROM d1_migrations WHERE id BETWEEN 1 AND 32 ORDER BY id").all();
  const present = new Set((rows.results || []).map((row) => Number(row.id)));
  return Array.from({ length: 32 }, (_, index) => index + 1).filter((id) => !present.has(id));
}
