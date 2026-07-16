# Franchise Field Dictionary

Last updated: 2026-07-17 00:28 (Asia/Jakarta)

## Purpose
This document is the review-facing source of truth for franchise listing fields that often appear under different brochure wording. Keep runtime labels and OCR evidence keywords aligned with `src/lib/franchise-field-dictionary.js`.

## Canonical Rules

| Field | Canonical label | Accepted brochure wording | Review rule |
| --- | --- | --- | --- |
| `fee_license_idr` | Biaya Lisensi / Kemitraan | biaya lisensi, license fee, franchise fee, biaya franchise, biaya kemitraan, investasi kemitraan, joining fee, biaya join, join fee | Treat as one canonical concept for the upfront right-to-join/license/partnership fee. Do not create a separate field just because the brochure uses a synonym. |
| `total_investment_idr` | Total investasi | total investasi, total biaya investasi, perkiraan biaya investasi, total modal awal | Do not infer from a single fee. Approve only when the document states a total, or when all explicitly separated cost components are available and the calculation is obvious. |
| `royalty_percent` | Royalti (%) | royalty, royalty fee, royalti, royalti fee, gratis royalty | `Gratis`, `free`, or `tanpa` royalty can support `0%` only when the excerpt clearly refers to royalty. |
| `royalty_basis` | Dasar royalti | dasar royalti, basis royalty, royalty basis, omzet, profit, keuntungan | Use `none` only when the document clearly says royalty is free/none. Do not approve a vague `none` suggestion without the highlighted basis. |
| `support_system` | Dukungan mitra | support system, dukungan mitra, support mitra, fasilitas mitra, training, SOP, bahan baku, marketing | Use the closest clear brochure statement and keep the suggested text concise. |
| `outlet_type` | Tipe outlet | tipe outlet, jenis outlet, format outlet, booth, kios, ruko | Normalize display case such as `Ruko`, `Booth`, `Kios`; do not preserve all-caps OCR. |

## Maintenance
- Add new ambiguous fields here before expanding OCR extraction or manual review labels.
- If a field label changes here, update `src/lib/franchise-field-dictionary.js` and run `pnpm run state-transitions:check`.
- OCR proof must highlight the exact excerpt used as the basis before admin approval.
