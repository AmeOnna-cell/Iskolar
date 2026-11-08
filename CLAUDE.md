# Iskolar: handoff for the next session

## Project
Iskolar helps Filipino college students find scholarships, check eligibility (explained requirement by requirement), prepare documents and track applications. Coordinators and admins manage listings, questions, announcements, users and the audit log.

- **Stack:** Next.js 15 (App Router, TypeScript strict, Tailwind v4), Supabase (Postgres with RLS, Auth, Realtime, pg_cron, pg_net, Vault), Vercel.
- **Where the brief and design live:**
  - Build brief: `../ISKOLAR_CLAUDE_CODE_PROMPT.md` (outside the repo, in `Desktop\ST`).
  - Research and prototype: `reference/`.
  - Design system: `DESIGN.md`. Product context: `PRODUCT.md`.
- **Docs:** `docs/`: PROGRESS, SETUP, setup-smtp, permissions, caching, data-retention, notifications, performance, plus screenshots. Critique snapshots are in `.impeccable/critique/`.

## Live setup
- **Supabase:** project `gfiutwubhsnpgkaflpuh` (Singapore).
- **Vercel:** project `iskolar` at https://iskolar-ochre.vercel.app.
- **GitHub:** `AmeOnna-cell/Iskolar`. Every push to `main` deploys automatically.

## Deploy rules
1. **Run the tests:**
   - `npm run lint`, `npx tsc --noEmit`, `npm test`
   - `npx supabase test db`
   - `npm run build`, then Playwright with `CI=1 npx playwright test`
2. **Migration before code:** `npx supabase db push --remote --dry-run`, then `npx supabase db push --remote --yes`. The CLI targets the local stack unless you pass `--remote`.
3. **Confirm local and cloud match:** `npx supabase migration list --remote`.
4. **Then** `git push origin main`.
5. **Ask the user before any cloud push** (db push or git push) unless they have already said yes for that step.

## Already set in the cloud (don't ask again)
- **Vercel env vars:** Supabase URL and keys, Gmail SMTP, `APP_URL`, VAPID keys, `CRON_SECRET`.
- **Supabase Vault:** `iskolar_app_url` and `iskolar_cron_secret`.
- **Supabase Auth:** Custom Access Token hook, SMTP, email templates, Site URL.

## Standing rules
- **`.env.local`:** never read, create or edit it; it holds the user's real credentials. Use `.env.example` for names only. Local dev and tests get placeholder or local values as environment variables when the server starts.
- **Secrets:** never commit any.
- **Skills:**
  - taste (design-taste-frontend) with dials 3/3/4.
  - impeccable per-screen loop: critique with two isolated agents (design review, detector plus browser), then ask the user, then fix, then polish.
  - awesome-design-md, through `DESIGN.md`.
  - Playwright screenshots via `npm run screens -- <dir> [student:|coordinator:|admin:]<route>`, at 360/768/1280/1440 in both themes. In Git Bash prefix the command with `MSYS_NO_PATHCONV=1`.
- **E2E on this machine:**
  - Clear `.next/cache/fetch-cache` before full runs. Stale public search caches break the count assertions.
  - Under heavy memory pressure from other apps, tests time out. Rerun before treating a failure as real.

## Progress (2026-11-08)
- **Phases 1–7:** done and live. These are foundation, the email pipeline, database, auth, student screens, staff/admin, notifications and performance.
- **Phase 8 (polish/QA):**
  - Item 1, sample-listing badges: live.
  - Stage 1, dashboard and Find scholarships: live (`7bad2d3`).
  - Stage 2, group 1 (landing, scholarship detail, help): done and pushed (`ee3de05`).
  - Stage 2, group 2 (eligibility check, results, My applications, alerts, settings hub): done and pushed (`90c0ff1`). 57 of 57 E2E pass.
  - Stage 2, group 3 (sign-in pages): done and pushed (`972d71d`). 57 of 57 E2E pass on a reset DB. CI green.
  - Stage 2, group 4 (staff and admin screens): done and committed (2026-11-08). 58 of 58 E2E pass on a reset DB. Not pushed yet unless the user said so.
- **Branch:** `main`. No work-in-progress branch.

## Remaining work, in order
1. **Phase 9:**
   - The remaining E2E specs from the brief (4.1–4.13 coverage review).
   - README, SETUP checklist, final report.
   - Investigate the one-off pgTAP failure seen in Phase 6.
   - Upgrade Next.js to clear the bundled `postcss` audit warning.

## Open issues
- **GitHub Actions CI failure (fixed 2026-11-05):** since Phase 7, the "audit log exports as CSV" E2E test (`e2e/4.5-admin-users.spec.ts`) failed on CI's fresh database, because "Older entries" needs more than 25 audit rows. The test now seeds 26 rows itself. It was verified after `npx supabase db reset` (57 of 57 pass). `ci.yml` is now split into three jobs (static, database, e2e) and uses the Node 24 v7 actions. The user confirms the green run on GitHub. Always verify E2E fixes against a reset DB, because the local DB builds up rows that hide this kind of bug.
- **The one-off pgTAP failure from Phase 6:** never reproduced.
- **`npm audit`:** reports `postcss` inside Next.js (high). It needs a Next upgrade.

## First step next session
Read `docs/PROGRESS.md`. Push group 4 if the user hasn't yet (ask first). Then start Phase 9: the E2E coverage review against brief §4.1–4.13, README, SETUP checklist, final report, the pgTAP investigation, and the Next.js upgrade. The group 4 skipped items are listed in PROGRESS.

**E2E on this machine:** run E2E against a production build (`npm run build`, then `CI=1 npx playwright test`). Dev mode compiles routes on first hit, and the long workflow test can then pass its 30 s limit. Stop any `next dev` or `next start` first, because a server writing to `.next` during a build corrupts it.
