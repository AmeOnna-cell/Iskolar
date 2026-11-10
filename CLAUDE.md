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
  - Export the fake env values from `.github/workflows/ci.yml` (Gmail placeholders, `EMAIL_DEV_SMTP`, `CRON_SECRET`) before the run, or `4.7-notifications` times out.
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
  - Stage 2, group 4 (staff and admin screens): done and pushed (`a1604dc`).
- **Phase 9 (tests and docs):** done and pushed (`50a572d`, CI green); see `docs/REPORT.md`.
- **Privacy note and `/privacy`:** done and pushed (`7ebb48a`).
- **Team-leader revisions** (brief: `C:\Users\TUF DASH\Downloads\REVISIONS_PROMPT.md`, groups A–F): all built.
  - A–E pushed: A `77783d7`, B `976d79d`, C `e061464`, D `35ce96c`, E `6646248` plus follow-ups `a60e479`.
  - Migrations `20261108120000_self_delete` and `20261108130000_announcement_links` are live; local and cloud match.
  - Group F (`cc70fa8`) and the final summary docs are pushed.
  - Final run on a fresh reset: unit 52, pgTAP 283, E2E 107, all pass.
  - The summary table is at the top of "Team-leader revisions" in `docs/PROGRESS.md`.
- **Branch:** `main` (FAQ work merged from `faq-wip`).

## Progress (2026-11-10): FAQ suggestions
- Rule-based FAQ suggestions are built and merged into main. The details are in "FAQ suggestions" in `docs/PROGRESS.md`; the scoring rules are in `docs/faq-search.md`.
- Migration `20261110120000_faqs` is not yet on the cloud. Push it with `db push --remote` before the code, and ask first.
- Run the suite in steps (reset, then lint/typecheck/unit, then pgTAP, then build, then E2E with `--workers=1`). Check for stray `node` processes first: a "killed" background job once kept running and shared the DB and `.next`.

## Remaining work
- Waiting on the user: the deferred P2/P3 items in `docs/REPORT.md`, and the items left by choice in PROGRESS ("Summary: all revision groups").

## Open issues
- **Privacy page:** the user's sign-up wording, plus a question-context clause and contact iskolar.notifications@gmail.com.
- **`npm audit`:** clean, via `overrides` in package.json. Drop the `next.postcss` override on Next 16.4.5+.
- **pgTAP:** tests 40 and 60 re-anchor the seed dates (the seed is relative to the reset day), so they pass on an old local DB. E2E still expects a recently reset DB.

## First step next session
Run `git status`. If group F (`cc70fa8`) isn't pushed yet, ask before pushing. Then ask the user what's next: the deferred items in `docs/REPORT.md` or the "left by choice" list in PROGRESS. Shared pieces: the drawer (`components/ui/drawer.tsx`: `Drawer` + `useUrlPanel`) and the list/detail split (`components/scholarship/split.tsx`).

**E2E on this machine:**
- Run against a production build (`npm run build`, then `CI=1 npx playwright test`) on a reset DB.
- Export the fake env values from `.github/workflows/ci.yml` first.
- Stop any `next dev` or `next start` before building, because a server writing to `.next` during a build corrupts it.
