# D1 Static Publish Strategy

Last updated: 2026-06-19 06:10 (Asia/Jakarta)

## Problem

D1 is the source of truth for franchise listings, but public franchise detail pages are static HTML for SEO. A D1 write does not automatically rebuild Cloudflare Pages. We need a publish strategy that keeps pages fresh without wasting Cloudflare Pages builds.

## External Constraints

- GitHub Actions scheduled workflows can run as often as every 5 minutes, but scheduled jobs can be delayed or dropped during high-load periods. Avoid scheduling at the exact start of the hour. Source: GitHub Actions schedule docs, <https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule>.
- Scheduled workflows run on the default branch. Source: GitHub Actions schedule docs, <https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule>.
- GitHub Actions is free for standard GitHub-hosted runners in public repositories. Private repositories receive included monthly minutes by plan; GitHub Free currently lists 2,000 minutes per month. Source: GitHub Actions billing docs, <https://docs.github.com/en/billing/concepts/product-billing/github-actions>.
- Cloudflare Pages build quota must be treated as scarce on the current plan. Do not trigger a Pages build for every D1 edit.
- Cloudflare Pages Deploy Hook mode depends on the Pages project build settings. The project must run a build command (`pnpm run build` preferred, or `pnpm run build:astro`) and output `dist`; otherwise Pages skips dependency installation and npm-backed Functions imports fail during bundling.
- If GitHub Actions commits generated files back to the default branch, the connected Cloudflare Pages Git integration can treat that commit as a normal repository push and trigger a Cloudflare Pages build. Content polling workflows must not commit generated output unless that build trigger is intentional.

## Strategy Options

| Strategy | Freshness | Cloudflare Pages build usage | GitHub Actions usage | Complexity | Main Risk |
| --- | --- | --- | --- | --- | --- |
| Twice-daily scheduled publish | Up to about 12 hours stale | Very low; at most 2 content builds/day if dirty | Very low or none | Low | Too slow for franchisor self-service edits |
| GitHub Actions polling every 30 minutes, Cloudflare builds via Deploy Hook | Usually 0-30 minutes stale | Only when dirty, and capped by our own guardrails | Low checker cost | Medium | Still consumes Cloudflare build quota when dirty |
| GitHub Actions polling every 30 minutes, GitHub builds and deploys `dist/` directly | Usually 0-30 minutes stale | Avoids Cloudflare build quota for content publishes | Moderate; install/build/deploy only when dirty | Medium-high | More secrets and deployment logic in GitHub Actions |
| GitHub Actions polling every 15 minutes, GitHub builds and deploys `dist/` directly | Usually 0-15 minutes stale | Avoids Cloudflare build quota for content publishes | Higher; twice as many checks as 30-minute polling | Medium-high | Can waste private-repo Actions minutes and create operational noise |
| GitHub Actions builds, commits generated output, then pushes | Depends on schedule | Can accidentally trigger a Cloudflare Git build after every generated commit | Moderate | Medium | Double work: GitHub builds/commits, then Cloudflare builds again |
| Immediate per-write deploy hook | Fastest | Worst; one build per edit burst unless heavily throttled | Low | Medium | Too easy to burn build quota |

## Recommendation

Use a staged hybrid that balances both free tiers:

1. Keep the twice-daily strategy as the safe baseline until the rebuild queue exists.
2. Implement a D1-backed dirty queue: `site_rebuild_requests` plus `site_publish_state`.
3. Move to **GitHub Actions polling every 30 minutes** after the queue is stable.
4. Use **GitHub Actions as the checker and scheduler**:
   - GitHub Action checks D1.
   - If nothing is dirty, the workflow exits quickly.
   - If dirty, it decides whether a publish is allowed based on daily cap, minimum interval, and concurrency.
5. Use **Cloudflare Pages Deploy Hook as the first publish mode**:
   - This uses Cloudflare Pages build quota only when D1 has pending public-page changes.
   - GitHub Actions usage stays low because it mostly performs quick checks.
   - Start with a conservative content build cap, such as 8-12 Cloudflare content publishes per day for `franchisee.id`.
6. Keep **GitHub direct `dist/` deploy** as the fallback/upgrade mode:
   - Use this if Cloudflare Pages build quota becomes the bottleneck.
   - In that mode, GitHub runs `pnpm install`, `pnpm run build:astro`, then deploys `dist/` with Wrangler.
   - This shifts content build cost from Cloudflare Pages builds to GitHub Actions minutes.
7. Do not let the poller commit generated `dist/`, root HTML, snapshot JSON, or manifests back to `main`; that can trigger an extra Cloudflare Git build and waste both systems.
8. Keep normal code pushes on the existing Cloudflare Pages Git integration unless we later decide to consolidate all deploys through GitHub.
9. Keep an admin-only manual publish for urgent edits.

Do not start with 15-minute polling. It is attractive, but it doubles the polling volume. Use 30 minutes first, observe real edit frequency, build time, and monthly Actions usage, then lower to 15 minutes only if freshness becomes a real business problem.

## Proposed 30-Minute Flow

1. Any public-page-affecting D1 mutation writes or upserts a pending `site_rebuild_requests` row scoped by:
   - `site_id`
   - `franchise_id`
   - `reason`
   - `status = 'pending'`
   - `created_at`
2. The same mutation updates `site_publish_state` for that `site_id`:
   - `dirty_since`
   - `last_change_at`
   - `pending_count`
3. GitHub Actions scheduled workflow runs every 30 minutes, ideally off the top of the hour, for example minute 7 and 37.
4. The workflow queries D1 for pending work for `site_franchisee_id`.
5. If there are no pending requests, it exits successfully without installing dependencies or building.
6. If pending requests exist, it checks guardrails:
   - last successful publish is older than the minimum publish interval
   - daily publish count is below the configured maximum
   - no other publish workflow is already running
7. If allowed, first publish mode calls the Cloudflare Pages Deploy Hook. Cloudflare then runs the configured Pages build command, including `pnpm run build:astro`.
8. If Cloudflare Pages build quota becomes constrained, switch publish mode to GitHub direct deploy: install dependencies, run `pnpm run build:astro`, then deploy `dist/` with Wrangler.
9. After deploy success, the workflow marks relevant requests as `deployed` and updates `site_publish_state.last_published_at`.
10. After deploy failure, requests remain pending or move to `failed_retryable` so the next run can retry.

## GitHub Commit/Push Rule

The polling workflow must not commit generated output back to the repository.

Bad pattern for this project:

1. GitHub Actions detects dirty D1.
2. GitHub Actions runs the build.
3. GitHub Actions commits generated HTML/JSON to `main`.
4. Cloudflare Pages sees the commit and runs another Git-triggered build.

That can spend both GitHub Actions minutes and Cloudflare Pages build quota for the same content update. It also adds generated-file churn to git history.

Good patterns:

- GitHub checks D1, then calls a Cloudflare Pages Deploy Hook when dirty.
- GitHub checks D1, builds `dist/`, then uses `wrangler pages deploy dist` without committing generated output.
- Normal developer code pushes still trigger Cloudflare's Git-connected build.

## Guardrails

- Use GitHub Actions `concurrency` so only one publish workflow runs per site at a time.
- Add a daily max Cloudflare content publish count, starting around 8-12/day for `franchisee.id`.
- Add a minimum interval between successful content publishes, starting at 30 minutes.
- Add `workflow_dispatch` for manual admin publishing.
- Do not compare full database exports on every poll. Use the D1 dirty queue as the primary signal.
- For manual SQL changes outside the app, require an admin "mark site dirty" command or a manual workflow dispatch.
- Keep all site-specific state scoped by `site_id` because the shared D1 serves multiple network domains.
- Track publish mode per site: `cloudflare_deploy_hook` first, `github_direct_deploy` if Cloudflare build quota becomes constrained.

## Why This Beats Twice Daily After Launch

Twice daily is excellent while the system is still being built because it is predictable and cheap. After franchisor self-service editing goes live, 12-hour freshness can feel broken: a franchisor may edit a phone number, price, description, or social link and expect the public page to update the same day.

The 30-minute GitHub polling strategy gives a better product experience while still avoiding per-edit builds. Multiple edits inside one 30-minute window collapse into one publish.

## Why Not Pure Immediate Publishing

Immediate publishing is technically simpler to explain but worse operationally. A franchisor editing five fields could cause five publish attempts unless every mutation path is carefully throttled. The queue-plus-polling model makes batching the default behavior.

## Working Decision

Adopt this as the target direction:

- Short term: twice-daily scheduled publishing remains acceptable.
- Near term: implement D1 dirty queue and GitHub Actions 30-minute polling.
- Preferred first content publish mode: GitHub Actions polls and calls the Cloudflare Pages Deploy Hook only when D1 is dirty and guardrails allow a publish.
- Fallback/upgrade content publish mode: GitHub builds Astro and deploys `dist/` directly to Cloudflare Pages when Cloudflare build quota needs stronger protection.
- Never commit generated publish output from the poller to the default branch unless intentionally accepting a Cloudflare Git-triggered build.
- Revisit 15-minute polling only after measuring actual edit frequency and Actions usage.

## Implementation Status

Implemented on 2026-06-18:

- `migrations/0003_site_publish_queue.sql` creates `site_rebuild_requests` and `site_publish_state`.
- The migration has been applied to remote D1 `franchise_db`.
- `functions/_site-publish-queue.js` provides `siteRebuildStatements()` for Pages Functions.
- `functions/form-submit.js` enqueues rebuild requests for franchisor listing submissions, claim submissions, dev unclaimed creation, and dev test-data clearing.
- `scripts/d1-static-publish-poller.mjs` checks D1 through the Cloudflare API, expires stale queued requests, enforces per-site guardrails, calls the deploy hook in the default publish mode, and supports direct deploy fallback state marking.
- `.github/workflows/d1-static-publish.yaml` runs the poller at minutes 7 and 37 every hour plus manual `workflow_dispatch`.
- `package.json` exposes `pnpm run publish:d1:poll` for local poller execution when the required environment variables are present, and `pnpm run build` as the conventional Cloudflare Pages build entrypoint.
- `wrangler.toml` declares `pages_build_output_dir = "dist"` so Pages treats the repository config as valid for Pages builds.

Still required before GitHub automation is live:

- Add GitHub secret `CLOUDFLARE_API_TOKEN` with D1 query/write permission for `franchise_db`.
- Add GitHub secret `PAGES_DEPLOY_HOOK_FRANCHISEE_ID` containing the full Cloudflare Pages Deploy Hook URL.
- In Cloudflare Pages project settings, set build command to `pnpm run build` and output directory to `dist` for both Git push builds and Deploy Hook builds.
- Optionally add GitHub variables `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, and `PAGES_PROJECT_NAME`; defaults are present for the current `franchisee.id` project.
- Push the workflow to GitHub and verify the first dirty D1 edit triggers exactly one Pages build.
