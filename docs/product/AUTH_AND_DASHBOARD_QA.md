# Controlled account and dashboard QA

For the Franchise Network expansion, use the [Franchisor rollout plan](https://github.com/cfpages-admtravelbos/Franchisor.id/blob/main/docs/product/NETWORK_MEMBERSHIP_ROLLOUT_PLAN.md) and its separate per-site acceptance matrix. A Franchisor repository build or legacy route returning 200 does not prove the shared identity or membership journey is live.

Use disposable accounts and a disposable brand. Record the date, role, route, action, expected outcome, actual outcome, and sanitized request ID for each run. Never paste tokens, personal contacts, or real payment details into test records. These steps require a signed in operator and are not proved by a repository build.

## Identity and access

- Register with email and password, then log out and log back in. Check role selection and that `/daftar` does not create a second profile on refresh.
- Register with Google, complete `/sso-callback/`, then log in using the same email by the other available method. Check whether Clerk links the intended identity before changing anything in D1.
- Request password recovery, use the email link once, and check the expired link and wrong email states.
- Visit `/profil` and `/dashboard` signed out, then with franchisee, franchisor, staff, and admin sessions. Confirm that tabs and API responses follow the actual role, never another account's data. Log out and check both shells again.
- On `/dashboard`, confirm Ganti akun and Keluar appear only with a Clerk session. Ganti akun should end the old session and return to dashboard login; Keluar should open the homepage. A failed sign-out must leave the controls usable with a retry message.
- Once the Franchisor app is deployed, sign the same test person into both domains and verify one Clerk identity maps to one D1 user without assuming cross-domain cookies. Check expired, denied, and role-switched sessions on each origin.

## Visual check at desktop and narrow mobile width

- Check `/profil` navigation for franchisee, franchisor, and admin; active and hover tabs, role badges, account menu replacement, and dark header contrast.
- Check `/dashboard` locked, login, ready, and expired session states. Verify that controls remain readable and tappable without horizontal overflow and the current tab is clear.
- Open Review, Outreach, Premium, and Publication with the relevant role. Check table loading, empty, error, and confirmation states, including the quick edit button moving to its populated Review form.

## Owner and public publication

- On a disposable published listing, change a contact field and upload one image. Confirm the public page keeps old values while both proposals await admin review, with no other owner's listing reachable.
- From admin Review, reject one proposal and approve another with written evidence. Confirm the decision is single use, the new public values appear only after the rebuild queue drains, and unrelated listing data remains unchanged.
- Check the GitHub scheduled publish workflow, Pages build secrets and build command, the matching D1 rebuild request, deployment SHA, and final public detail URL. Record each link or sanitized identifier.

Pass only when each persona can finish its flow and denied roles cannot view or change another user's data. If a step fails, record the exact step, fix the shared cause, and rerun that flow.
