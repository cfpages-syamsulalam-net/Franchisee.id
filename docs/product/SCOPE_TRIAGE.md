# Scope Triage For Compound Requests

Last updated: 2026-07-17 10:22 (Asia/Jakarta)

Use this note when a request combines product policy, UI, backend behavior, data migration, SEO, analytics, docs, and operations in one turn. The goal is to keep momentum without losing connected ideas.

## Priority Levels

| Level | Meaning | Default action |
| --- | --- | --- |
| P0 | Required to satisfy the explicit current request or prevent a broken/unsafe result. | Implement in the current session. |
| P1 | Low-risk, closely related work that completes the feature properly or prevents immediate drift. | Implement in the current session when feasible. |
| P2 | Valuable but separable work, larger strategy, or work needing product review/manual QA. | Record in the relevant tracker or `SUGGESTION.md`; do not silently drop it. |

## Session Triage Template

Use this inside the relevant tracker when scope is broad:

| Item | Priority | Ship now? | Owner/source | Notes |
| --- | --- | --- | --- | --- |
| Explicit bug or requested implementation | P0 | Yes | User request | Define exact done condition. |
| Closely related docs/contracts/checks | P1 | Usually yes | Repo rules | Update docs and checks before validation. |
| Broader product/SEO/UX strategy | P2 unless explicitly requested now | No, unless small and unblocked | Product tracker | Capture acceptance criteria and implementation phases. |

## Acceptance Contract

For broad work, write or infer:

- Goal: what outcome changes for the user or staff.
- Primary user: franchisee, franchisor, admin, staff, anonymous visitor, or search engine visitor.
- Must show: evidence, CTA, status, copy, data, or control required.
- Must not show: confusing copy, wrong source, duplicated controls, internal terms, or unsupported claims.
- Failure state: what happens when data, permissions, quota, API, or proof is missing.
- Done when: concrete observable checks, code paths, docs, and validation commands.

## Applying This To Franchisee.id

- UI changes should also reference `docs/ux/UI_REFERENCE_MAP.md`.
- State-heavy flows should also reference `docs/architecture/STATE_TRANSITION_AUDIT.md`.
- SEO/content strategy should live in a focused SEO document, then implementation can be pulled into code in phases.
- A P2 item can become P0 later when the user explicitly asks to implement it.
