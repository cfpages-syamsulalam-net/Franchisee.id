# New-brand ownership review

**Network adoption, 2026-09-25:** This Franchisee.id contract and shared D1 migrations `0037`–`0039` must also govern new-brand submissions and later owner public edits from Franchisor.id. The Franchisor July port predates these safeguards; its current [rollout plan](https://github.com/cfpages-admtravelbos/Franchisor.id/blob/main/docs/product/NETWORK_MEMBERSHIP_ROLLOUT_PLAN.md) requires parity before enabling production onboarding. A membership payment does not bypass independent ownership review or make a page live.

A franchisor form is an applicant's claim, not proof of authority. The submitted package stays private until an admin checks ownership through a source independent of the application.

## State and access

- Submit creates an ownerless `pending_review` franchise, a draft site publication and a pending `franchise_submission_reviews` record. The applicant can see the private listing through their profile; the form returns `status=pending`.
- Only admins receive applicant identity and self-reported verification details from the dashboard API. Approval requires independent evidence notes, assigns ownership, publishes and queues a rebuild in one D1 batch.
- Rejection stores the admin's reason, archives the unpublished application and releases the pending brand name. The applicant may submit a corrected new application; a rejected review cannot be approved later. Admin can still see the rejected record in Review history.
- D1 triggers prevent early ownership or publication and reject decisions without notes or stale second decisions. Legacy published listings without a review record remain as they were; they have not been retroactively verified.
- Public brand matching may show that an application is pending, but never exposes applicant contact or an unpublished listing link. A unique index prevents simultaneous exact-name pending submissions. Archived rejected applications do not block a new submission.
- Applicants can edit profile details during review, so the admin must verify current details before deciding. Review of later trust-sensitive changes to approved public contacts remains a separate gate.

## Acceptance

1. A new submission creates a private pending listing and review record without assigning an owner or queuing a public build.
2. Staff cannot decide; admin cannot approve without evidence notes; racing or repeated decisions fail safely.
3. Rejection archives the private application and releases its brand name. A new submission can be reviewed; the old rejected record cannot be approved.
4. Approval assigns the applicant as owner, publishes and queues a rebuild together. Existing claims and legacy published listings continue to work.
5. Direct publication actions and SQL writes cannot publish an unapproved pending application.
## Published owner changes (25 September 2026)

Once a listing is published, `/profile-data` listing edits and `/profile-upload` media changes create an immutable pending proposal. Franchisor profile identity and contact edits for an owned published listing use the same admin review queue. Public D1 values remain unchanged until an admin approves with written verification notes. Admin approval checks current ownership and old field values, applies chosen fields, and queues rebuilds. A rejected proposal has no public effect. One pending owner proposal per listing, owner, and field group is enforced in D1 migration 0039. New changes require a decision on the existing proposal first. The `franchise_assets` record for a proposed upload may exist before approval, but its public listing field stays unchanged. This path still needs a controlled signed in run using a disposable published brand and two roles.
