# Existing-brand notice in /daftar — UI/UX audit

Reviewed against the current form and claim and listing contracts.

| Severity | Evidence and affected journey | Change | Verification |
| --- | --- | --- | --- |
| P1 | A franchisor learns an exact brand is already listed only after completing the full form. The submit API returns a plain 409, while the form autocomplete searches only unclaimed listings. | Show an exact-name notice beside the first brand field before the applicant invests time in the form. Preserve the server duplicate guard as a final check. | Focused API/form regression and mobile/desktop production check after deployment. |
| P1 | Existing unclaimed listings can be claimable, already pending, or managed; conflating those states invites impersonation. | Offer **Klaim listing** only for an ownerless unclaimed listing with no pending claim. For a managed listing, show its published page and only business contact details whose authority was independently reviewed. No new-listing duplicate path. | Exercise unclaimed, pending, approved managed, unreviewed managed, duplicate-name and unpublished fixtures. |
| P1 | Contact person and WhatsApp live in a franchisor profile, while account email and full form payload are private. A public search response must not return private profile data or imply payment tier means ownership proof. | Whitelist public brand fields; show PIC/phone only for a published listing with an approved ownership claim. Label self-reported contact details elsewhere as unverified. | Response projection test rejects private fields and invalid listing URLs. |
| P2 | A network lookup can fail, and draft/claim mode may change while a response is in flight. | Keep the notice in an accessible status region, ignore stale responses, allow a retry, and keep the final server guard. Use one compact row per exact listing. | Keyboard, narrow-width, stale-response and error checks. |

The backend must still refuse creating a second listing under an existing name. The change replaces a late dead end with an early explanation and a useful next action.
