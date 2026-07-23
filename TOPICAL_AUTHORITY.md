# Topical Authority — franchisee.id

Last audited: 2026-07-23 (Asia/Jakarta)

## Role and boundary

Franchisee.id is the buyer/operator side of the Franchise Network: it helps a prospective or current franchisee discover opportunities, test personal and commercial fit, verify claims and documents, model downside-aware economics, open an outlet, operate it, resolve problems, and decide whether to renew, transfer, or exit.

This authority plan does not promise profit, rank brands without a disclosed method, replace an advocate, accountant, tax consultant, lender, engineer, or sector regulator, or treat every licence model as a legally valid Indonesian waralaba. `/peluang-usaha`, its category/modal/city routes, `/bandingkan`, `/alat-franchise`, brand-detail pages, `/daftar`, `/profil`, and `/premium` retain their product and commercial intents. Editorial pages explain decisions and link to those routes; they do not duplicate listing inventories or account workflows.

Franchisor.id is a separate publisher for the network-owner perspective. Cross-domain subject overlap is allowed. Same-domain articles below must keep their stated primary jobs and boundaries.

## Evidence audited

- Canonical repository: `cfpages-syamsulalam-net/Franchisee.id`, local `main`, clean before this work.
- Architecture and product evidence: repository `AGENTS.md`, `CODEBASE.md`, `docs/README.md`, `docs/seo/TOPICAL_AUTHORITY_AND_DIRECTORY_SEO_PLAN.md`, `docs/seo/CATEGORY_CONTENT_BACKLOG.md`, `PRD.md`, and the sibling Franchisor network contract.
- Site shape: hybrid WordPress export plus Astro static routes, Cloudflare Pages Functions, shared D1 `franchise_db`, shared R2 assets, and Clerk identity with D1 authorization.
- Current D1 snapshot: 197 published franchise records across 14 source-category labels. These rows are directory inventory, not 197 editorial articles.
- Astro public/product routes: directory hub; category, capital, city, and brand-detail routes; comparison and buyer tools; legal pages; login/profile/dashboard/premium surfaces.
- Sitemap files: `sitemap-complete.xml` contains 204 URLs: 138 tag archives, 20 brand-detail URLs plus the directory hub, three author archives, two event URLs, two `/category/` archives, and a mixture of pages/articles. `sitemap.xml` and `sitemap_index.xml` each reference four child sitemaps that are absent from the repository.
- Existing editorial evidence: seven top-level legacy articles, including broad “menguntungkan”, “jalan pintas”, and “menjanjikan” claims; `/peraturan-waralaba/`; category landing pages; archive hubs. Existing brand, city, category, modal, comparison, and calculator pages remain separate product coverage.
- Current primary Indonesian sources checked on 2026-07-23: [PP 35/2024 tentang Waralaba](https://peraturan.bpk.go.id/Details/297489/pp-no-35-tahun-), [Permendag 25/2025 tentang penerbitan STPW oleh pemerintah daerah](https://jdih.kemendag.go.id/peraturan/peraturan-menteri-perdagangan-republik-indonesia-nomor-25-tahun-2025-tentang-tata-cara-penerbitan-surat-tanda-pendaftaran-waralaba-oleh-pemerintah-daerah-1), [PP 28/2025 tentang perizinan berusaha berbasis risiko](https://peraturan.bpk.go.id/Details/319773), [Permendag 33/2025 tentang standar sektor perdagangan](https://peraturan.bpk.go.id/Details/332960), [UU 20/2016 tentang Merek dan Indikasi Geografis](https://peraturan.bpk.go.id/Details/37595/Uu-No-20-Tahun-2016), [UU 27/2022 tentang Pelindungan Data Pribadi](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022%20), [UU 30/1999 tentang Arbitrase dan Alternatif Penyelesaian Sengketa](https://peraturan.bpk.go.id/Details/45348/uu-no-30-tahun-1999), [POJK 19/2025 tentang kemudahan akses pembiayaan UMKM](https://ojk.go.id/id/regulasi/Pages/POJK-19-Tahun-2025-Kemudahan-Akses-Pembiayaan-Kepada-UMKM.aspx), and [DJP on taxation of franchise royalties](https://www.pajak.go.id/id/artikel/melihat-pajak-atas-bisnis-waralaba).

Counts are repository evidence, not a live-index or performance claim. Regulations, tax treatment, lending terms, and sector licences must be rechecked at drafting and publication.

## Existing coverage and risks

- The legacy sitemap is archive-heavy: 138 tag pages are `noindex` in local HTML but still listed, while author and old category archives add crawl noise.
- Both sitemap indexes reference missing child files; the build currently copies multiple legacy sitemap artifacts rather than establishing one verified generated owner.
- Seven broad articles overlap fundamentals, requirements, and category selection. Several titles imply guaranteed profitability or easy success without evidence.
- `/peraturan-waralaba/` is the natural legal hub but predates PP 35/2024 and the 2025 implementing/licensing changes; it requires source-by-source reconstruction and counsel review.
- Legacy category routes and `/category/*` overlap current canonical `/peluang-usaha/kategori/*` routes. Existing redirect policy should remain the migration owner.
- Category pages, modal/city landing pages, comparison, calculator, and brand-detail pages already own directory/product intents. Editorial briefs must support rather than reproduce them.
- User-generated or franchisor-supplied investment, turnover, margin, BEP, support, and outlet claims are not independent evidence. Each article must label assumptions and distinguish source claims from verified outcomes.
- City-only content expansion is excluded. Location guidance belongs in substantive site-selection articles and data-backed city directory routes, not name-swapped articles.

## Coverage matrix

| Completeness lens | Topic owners | Coverage decision |
|---|---|---|
| Definition, vocabulary, taxonomy, mechanisms | FRC-01 | Covers franchise/waralaba/licence distinctions and buyer/operator roles; brand categories stay in the directory. |
| Need recognition and buyer fit | FRC-01, FRC-02 | Includes “do not buy yet” and non-franchise alternatives. |
| Survey, diagnosis, comparison, selection | FRC-02, FRC-03, FRC-16 | Separates offer comparison, evidence verification, and fraud detection. |
| Budget, procurement, financing | FRC-04 | Downside scenarios and cash runway; no return guarantee or personalised credit advice. |
| Standards, regulation, documents, IP | FRC-05, FRC-06 | Current primary-source baseline with mandatory Indonesian counsel review. |
| Site, retrofit, utilities, lease | FRC-07 | Covers physical and digital/service models; city pages are not created. |
| Preparation, installation, commissioning | FRC-08 | Covers onboarding, fit-out, acceptance, training, and launch readiness. |
| Use and normal operation | FRC-09, FRC-12 | Daily controls plus supplier, technology, and franchisor-support interfaces. |
| Staffing, safety, health | FRC-10 | Employment and sector-safety claims require current specialist review. |
| Marketing and customer relationships | FRC-11 | Local acquisition, promotions, data consent, and brand-rule coordination. |
| Inspection, measurement, performance | FRC-13 | Owner dashboard, cash control, variance diagnosis, and corrective action. |
| Troubleshooting, repair, disputes | FRC-14 | Escalation, evidence preservation, negotiation, mediation, and counsel gates. |
| Upgrade, renewal, transfer, replacement, exit | FRC-15 | Full end-of-term lifecycle including closure and post-termination obligations. |
| Failure modes, myths, scams | FRC-03, FRC-04, FRC-16 | Separates weak evidence, bad economics, and deceptive conduct. |
| Stakeholders and scale | FRC-01–FRC-15 | Paths for first-time buyers, owner-operators, investors with managers, multi-unit operators, lenders, landlords, and professional reviewers. |
| Geography and climate | FRC-07, FRC-09, FRC-12 | Indonesia-specific lease, utilities, logistics, humidity/heat, and local licensing issues; no location swaps. |
| Environmental impact | FRC-07, FRC-09, FRC-12 | Waste, water, energy, packaging, spoilage, and take-back obligations where sector-relevant. |
| History and evolution | N/A | A standalone history cluster would not materially improve a buyer/operator decision; regulatory evolution is handled in FRC-05. |
| Materials and physical science | N/A | These vary by franchise sector and belong in verified category/brand operational content, not generic franchise articles. |
| News/trends | N/A | Volatile news is not a durable parent topic; material regulatory changes update FRC-05/FRC-06. |

## Topical map

| Topic ID | Parent topic | Reader outcome | Required subtopics/questions | Evidence/formats | Boundary | Article target |
|---|---|---|---|---|---|---:|
| FRC-01 | Franchise fundamentals and operator fit | Decide whether the model and role fit the reader before browsing brands | Terms; franchise versus licence/distribution/own brand; owner-operator versus managed; single versus multi-unit; skills, time, family, liquidity, and stop conditions | Primary regulation; role matrix; self-assessment; glossary | Does not rank offers (FRC-02), verify a brand (FRC-03), or calculate affordability (FRC-04) | 6 |
| FRC-02 | Opportunity discovery and comparison | Build a defensible shortlist from comparable facts | Search criteria; comparable fields; category/format trade-offs; territory; support; evidence gaps; inquiry sequence | Decision table; directory data; comparison worksheet | Directory inventory remains `/peluang-usaha`; verification belongs to FRC-03 and economics to FRC-04 | 6 |
| FRC-03 | Brand, owner, and claim due diligence | Verify who is offering what and test material claims before commitment | Identity; ownership; track record; outlet/reference calls; closures; litigation/search limits; data room; claim provenance | Source log; interview script; document checklist; counsel review | Legal interpretation belongs to FRC-05/FRC-06; scam response belongs to FRC-16 | 6 |
| FRC-04 | Unit economics, affordability, and financing | Model downside-aware cash needs and financing capacity without return promises | Total cash need; working capital; fees; royalty; tax; sensitivity; break-even method; debt service; runway; lender comparison | Auditable spreadsheet; scenario table; accountant/tax/credit review | No personalised investment, tax, or credit recommendation; contract fee rights belong to FRC-06 | 6 |
| FRC-05 | Indonesian franchise status, registration, and licensing | Identify regulatory checkpoints and questions for qualified advisers | PP 35/2024; prospectus; STPW roles; OSS; business/sector licences; reporting; logo; domestic products; changing rules | Current JDIH/BPK/OSS sources; dated legal checklist; Indonesian advocate review | Does not interpret negotiated clauses (FRC-06) or certify compliance | 6 |
| FRC-06 | Agreement, IP, data, and document review | Prepare a clause-by-clause issue list for counsel before signing | Parties; grant; territory; fees; supply; standards; audit; data; IP; confidentiality; default; dispute; renewal; termination; guarantees | Clause matrix; issue list; advocate, tax, and privacy review | Not legal advice; registration process belongs to FRC-05 and active disputes to FRC-14 | 6 |
| FRC-07 | Site, lease, utilities, and local feasibility | Reject unsuitable sites and align site obligations before signing | Catchment; access; competition; rent; lease-franchise term mismatch; utilities; permits; fit-out; delivery; hazards; remote/service models | Site scorecard; lease checklist; measured survey; engineer/sector review | Data-backed city browsing stays under `/peluang-usaha/kota`; build execution belongs to FRC-08 | 6 |
| FRC-08 | Onboarding, fit-out, training, and launch | Control the handoff from signed agreement to a verified opening | Mobilisation; design approvals; procurement; construction; equipment; training; hiring; systems; stock; testing; punch list; soft launch | Gantt; RACI; acceptance checklist; original records | Daily steady-state operations belong to FRC-09; site selection to FRC-07 | 6 |
| FRC-09 | Daily operations, quality, safety, and maintenance | Run repeatable shifts while detecting service, quality, safety, and asset failures | Opening/closing; SOP exceptions; quality controls; hygiene/safety; waste; inventory; maintenance; incidents; business continuity | SOP template; log sheets; sector expert review; incident tree | Staffing policy belongs to FRC-10; suppliers/IT support to FRC-12; KPI review to FRC-13 | 6 |
| FRC-10 | Staffing, leadership, and workforce compliance | Design roles, schedules, training, performance, and escalation responsibly | Organisation; labour need; recruitment; wages/benefits; shifts; training; incentives; misconduct; turnover; owner absence | Staffing model; competency matrix; current labour-source and HR/legal review | Does not give sector-specific professional licensing advice; daily SOP belongs to FRC-09 | 6 |
| FRC-11 | Local marketing, sales, reputation, and customer data | Grow demand within brand rules and measure customer acquisition responsibly | Launch plan; local channels; promotions; co-op funds; leads; conversion; reviews; complaints; consent; loyalty data; crisis messages | Campaign brief; attribution sheet; PDP/legal review | Brand-wide franchisor strategy belongs to Franchisor.id; operational service recovery belongs to FRC-09/FRC-14 | 6 |
| FRC-12 | Suppliers, technology, logistics, and franchisor support | Evaluate dependencies and escalate support failures with evidence | Approved suppliers; landed cost; substitutions; stockouts; cold chain; POS; cybersecurity; outages; training/support SLA; vendor lock-in | Dependency map; SLA checklist; security/sector review | Contractual remedies belong to FRC-06/FRC-14; inventory operations to FRC-09 | 6 |
| FRC-13 | Performance, cash control, and corrective action | Read outlet performance without confusing sales, margin, cash, and owner return | P&L; cash flow; working capital; variance; labour/food cost; cohort/local comparison; leakage; audit; action cycles | KPI dictionary; reconciled dashboard; accountant review | Initial feasibility belongs to FRC-04; fraud allegations and formal disputes belong to FRC-14/FRC-16 | 6 |
| FRC-14 | Relationship governance, disputes, and remediation | Preserve evidence and choose proportionate escalation when obligations or trust break down | Governance cadence; notices; cure periods; support failures; fee/supply disputes; mediation; arbitration/litigation; continuity; retaliation risks | Event chronology; notice log; advocate/mediator review | Does not predict outcomes or draft final legal notices; termination/transfer mechanics belong to FRC-15 | 6 |
| FRC-15 | Renewal, transfer, succession, and exit | Compare continue, renegotiate, transfer, sell, close, or convert options before deadlines | Renewal window; capex; valuation; buyer approval; assignment; succession; de-branding; staff/lease/supplier closeout; data/IP survival | Decision tree; exit checklist; legal/tax/accounting review | Active dispute strategy belongs to FRC-14; original affordability to FRC-04 | 6 |
| FRC-16 | Fraud, scam, and deceptive-offer literacy | Recognise manipulation, verify payment/control points, and respond safely | Fake brands; impersonation; forged documents; guaranteed returns; urgency; unofficial payments; ponzi-like recruitment; evidence preservation; reporting | Red-flag matrix; verification flow; counsel/law-enforcement platform guidance | Normal weak due diligence belongs to FRC-03; ordinary commercial underperformance to FRC-13 | 6 |

## Related-domain opportunities

- Franchisor.id can independently explain how a network owner builds disclosure, support, quality, territory, supply, and dispute systems. Franchisee.id should link only when that operator-side explanation materially helps a buyer evaluate evidence.
- Shared canonical brand records may support comparable facts on both domains, but each site needs its own publication row, copy, structured data, conversion path, and canonical decision.
- Franchise.id and Waralaba.id may later offer network-level or terminology-led perspectives. Their existence does not remove any useful Franchisee.id topic.
- Category specialists elsewhere in the owned portfolio may supply sector evidence, but generic franchise advice must not imply those sites endorse a brand or investment.

## Consolidation plan

| Existing URL/pattern | Observed role/problem | Decision | Destination/owner | Verification needed |
|---|---|---|---|---|
| `/peluang-usaha`, `/peluang-usaha/kategori/*`, `/peluang-usaha/modal/*`, `/peluang-usaha/kota/*`, `/peluang-usaha/[slug]` | Canonical directory, filters, and listings | keep | Product routes; supported by FRC-02/FRC-04/FRC-07 | Recount generated routes and indexability at each build |
| `/bandingkan`, `/alat-franchise` | Comparison and calculator tools | keep | Product tools; contextual links from FRC-02/FRC-04 | Confirm assumptions, data freshness, and no implied recommendation |
| `/apa-itu-franchise-peluang-bisnis-yang-terbukti-menguntungkan.html` | Broad definition plus unsupported profit framing | expand | FRC-01-01, preserve URL initially | Rewrite title/body, source definitions, remove guarantee language, compare historical signals before slug change |
| `/franchise-jalan-pintas-menjadi-pengusaha-sukses.html` | Overlaps fundamentals and promises ease/success | merge | FRC-01-02 or FRC-01-03; later redirect only after evidence review | Check backlinks/impressions and choose the strongest retained URL |
| `/syarat-franchise-panduan-lengkap-sebelum-memulai-bisnis-waralaba.html` | Mixes franchisor and franchisee requirements | expand | FRC-05 hub with buyer emphasis | Rebuild against PP 35/2024 and 2025 rules; counsel review |
| `/peraturan-waralaba/` | Natural legal hub but stale/unclear sourcing | expand | FRC-05 hub | Full source audit; replace obsolete references; dated review |
| Six category/promotional legacy articles | Thin category summaries with profit/growth claims | manual review | Canonical category route plus distinct category decision brief only where evidence supports it | Compare GSC/backlinks; remove promises; avoid generic “modal/tips” duplication |
| Legacy top-level category routes and `/category/*` | Duplicate old taxonomy | redirect | `/peluang-usaha/kategori/*` per existing route contract | Production one-hop checks and sitemap cleanup |
| `/direktori-franchise`, `/rekomendasi`, `/populer`, `/abjad`, `/kategori` | Legacy discovery archives | redirect | Closest `/peluang-usaha` owner per existing policy | Verify every alias and preserved query state |
| `/tag/*` (138 URLs) and `/author/*` | Noindex archives still present in sitemap | noindex | Keep crawlable only where needed for `noindex`; remove from generated sitemap | Verify live response/meta and inbound-link value before removal |
| `sitemap.xml`, `sitemap_index.xml`, `sitemap-complete.xml` | Competing artifacts; index references four absent child files | manual review | One build-derived sitemap/index owner | Validate live child responses, route inventory, redirects, noindex exclusions |
| `/artikel`, `/berita`, `/event` | Editorial/archive hubs | keep | Archive owners, not individual brief substitutes | Ensure pagination/canonicals and only maintained content is indexable |
| `/konsultasi` | Commercial service route | manual review | Commercial route, distinct from neutral legal/financial education | Verify actual offer, credentials, disclosures, and CTA claims |

## Internal-link architecture

- Central learning hub: `/franchisepedia/` links to the 16 topic hubs; every article links upward to its topic and laterally only to the next decision.
- Discovery path: FRC-01 → FRC-02 → `/peluang-usaha` or `/bandingkan` → FRC-03 → FRC-04 → FRC-05/FRC-06.
- Opening path: FRC-07 → FRC-08 → FRC-09 → FRC-10/FRC-11/FRC-12.
- Management path: FRC-13 → FRC-14 when a relationship breach exists → FRC-15 for renewal/transfer/exit.
- Fraud path: any listing, payment, or due-diligence article may link to FRC-16 when red flags appear; FRC-16 returns readers to FRC-03 for ordinary verification.
- Diagnostic articles link to prevention, evidence capture, corrective action, and the relevant stop/escalation condition.
- Brand, category, capital, and city routes receive links only when their current data answers the reader’s next task. No article receives a copied site-wide list of brand links.
- New editorial pages must be added to the generated sitemap only after publication QA; planned rows are not routes and must not appear in navigation or sitemaps prematurely.

## Evidence and editorial standards

- Recheck all statutes, regulations, OSS workflows, tax rules, labour rules, local licences, and official guidance on the drafting date. Cite primary Indonesian sources directly and record access/review dates.
- PP 35/2024 replaced PP 42/2007. Do not recycle an older franchise checklist without a current-law comparison.
- Legal articles require sign-off by an Indonesian advocate experienced in commercial/franchise agreements. STPW/licensing articles also require confirmation against the current OSS and relevant national/local authority workflow.
- Tax and accounting articles require a licensed Indonesian tax consultant or qualified accountant. Financing articles require a qualified finance/credit reviewer and lender-specific source checks.
- Every financial model must expose assumptions, cash timing, taxes, owner salary, working capital, debt service, replacement capex, and downside scenarios. Never label a projection as a result or promise BEP, revenue, margin, or profit.
- Brand/franchisor claims must be attributed and dated. Where possible, triangulate the prospectus/agreement, official registries, audited or accountant-reviewed data, current and former outlet interviews, and direct observation.
- Explain limits: a registry search can miss disputes; an outlet visit is a snapshot; testimonials are selected evidence; a registered mark or STPW does not prove profitability.
- Sector-sensitive claims—food safety, health/beauty, childcare, education, financial services, travel, automotive, construction, and environmental permits—require the relevant current regulator and practitioner review.
- Do not invent case studies, interviews, prices, conversion rates, crime reports, or field observations. Use labelled hypothetical examples only when the inputs and limitations are explicit.
- Corrections must preserve a visible source/review trail. High-stakes pages receive scheduled review at least every six months and event-driven review after regulatory change.

## First bounded publication cluster

Publish 12 assets after evidence and professional review:

1. FRC-01-01 as the central buyer fundamentals page, using the retained legacy URL after rewrite.
2. FRC-01-02 and FRC-01-03 for model and role fit.
3. FRC-02-01 and FRC-02-02 for shortlist and evidence-gap comparison.
4. FRC-03-01, FRC-03-03, and FRC-03-05 for entity, outlet-reference, and data-room checks.
5. FRC-04-01 and FRC-04-03 for total cash need and downside scenarios.
6. FRC-05-01 as the current-law buyer map.
7. FRC-16-01 as the scam red-flag and verification gateway.

This cluster follows one buyer journey from “is this model right?” through shortlist, verification, affordability, current legal checkpoints, and fraud controls. It links to existing directory/comparison/calculator routes without replacing them.

Monitor: valid indexation and canonical selection; impressions segmented by intent; checklist/tool completion or qualified directory transitions; inquiry quality; source/update feedback; duplicate-query/cannibalization signals; and whether users reach professional-review checkpoints. Rankings alone are not a success condition.

## Definition of done

- All 16 topic hubs exist with the six catalog briefs assigned below; topic and catalog counts match.
- Each published article has one intent, a testable promise, a named exclusion/owner, valid related links, and no existing-route slug collision.
- Legal, tax, finance, labour, safety, privacy, and sector-regulated claims pass the stated primary-source and professional-review gates.
- All legacy URLs receive an evidence-based keep/expand/merge/redirect/noindex decision before a replacement is published.
- One canonical sitemap system includes only indexable, deployed URLs; missing child sitemaps and noindex archive entries are resolved.
- Every article is reachable from its hub and has useful lifecycle links; no planned or published article is orphaned.
- First-wave measurement is recorded before the next wave; weak or cannibalizing pages are revised, consolidated, or stopped.
- Publication remains bounded by editorial capacity. This complete map is not approval for mass-producing 96 thin pages.
