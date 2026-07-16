# R2/D1 Migration Runbook

Last updated: 2026-07-17 00:28 (Asia/Jakarta)

## Purpose
Use this checklist for one-time migrations that move large text/media payloads out of D1 and into R2 while D1 keeps only metadata, previews, structured fields, and object keys.

## Rules
- New large payload writes must go to R2 first; D1 stores object pointers and review metadata.
- Migration scripts must be idempotent and batch-based.
- Cleanup must happen only after remote verification confirms every migrated row has an R2 object key and a readable preview or fallback.
- Do not keep a dashboard button that implies future data will be written to D1 first and migrated later.

## Standard Flow
1. Add or verify D1 columns that store R2 object keys, previews, hashes, and migration status.
2. Write a replayable migration script that:
   - selects only rows missing the target R2 key,
   - writes the R2 object,
   - updates D1 metadata after the R2 write succeeds,
   - logs batch progress without printing secrets.
3. Run a dry count against remote D1.
4. Run the remote migration sequentially. Do not parallelize Wrangler/cfman D1 operations.
5. Verify remote counts:
   - no unmigrated rows remain for the target payload,
   - no rows point to empty object keys,
   - representative objects are readable from R2,
   - old compatibility reads still work for pre-cleanup rows.
6. Run cleanup only after verification:
   - clear large D1 payload columns,
   - keep previews and structured extraction fields,
   - keep object keys and audit metadata.
7. Update docs, `CODEBASE.md`, `TECHNICAL_INVENTORY.md`, `CHANGELOG.md`, and session context.

## OCR Text Status
The historical OCR text backfill completed on 2026-07-16. New OCR text should be written to R2 directly through `_ocr-text-store.js`; D1 should not become the primary long-text store again.
