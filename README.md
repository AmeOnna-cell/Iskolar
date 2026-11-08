# Iskolar

Iskolar helps Filipino college students find scholarships, check whether they qualify (explained requirement by requirement), prepare the documents, and track their applications with reminders before deadlines. Scholarship coordinators and admins keep the listings current, answer students' questions, post announcements, and manage accounts, with every change in an audit log.

Live: <https://iskolar-ochre.vercel.app>. The nine listings it ships with are **sample data**, labelled as such in the app.

## Stack

- **Next.js 15** (App Router, TypeScript strict, Tailwind CSS v4), on **Vercel**.
- **Supabase**: Postgres with row-level security, Auth (Gmail SMTP), Realtime, `pg_cron` + `pg_net`, and Vault.
- **Tests**: Vitest (unit), pgTAP (database rules), Playwright (end to end, with axe accessibility checks).

## Run it locally

You need Node 22+ and Docker Desktop. The full steps are in [`docs/SETUP.md`](docs/SETUP.md).

```bash
npm install
npx supabase start                 # local Postgres, Auth and Mailpit (http://127.0.0.1:54324)
cp .env.example .env.local         # fill in the values; see docs/SETUP.md
npm run db:reset                   # migrations + sample data
npm run seed:admin -- you@example.com "Your Name"
npm run dev                        # http://localhost:3000
```

Locally, every email (sign-up, password reset, reminders) goes to Mailpit, not to Gmail.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server, production build, production server |
| `npm run lint`, `npm run typecheck` | ESLint, TypeScript |
| `npm test` | Unit tests (Vitest) |
| `npm run test:db` | Database tests (pgTAP): RLS, triggers, RPCs, eligibility |
| `npm run test:e2e` | End-to-end tests (Playwright). Run against a production build: `npm run build`, then `CI=1 npm run test:e2e` |
| `npm run db:reset` | Rebuild the local database from the migrations and the seed |
| `npm run db:types` | Regenerate `src/lib/supabase/database.types.ts` |
| `npm run seed:admin -- <email> ["Name"]` | Create the first admin, or promote an existing account |
| `npm run screens -- <dir> [role:]<route> …` | Screenshots at 360/768/1280/1440, light and dark |
| `npm run email:test` | Send a test email through the configured SMTP |

CI (GitHub Actions) runs three jobs on every push to `main` and every pull request: lint, typecheck and unit tests; the database tests; and the end-to-end suite against a fresh local Supabase.

## Deploy

1. Database changes go first: `npx supabase db push --remote --dry-run`, then `npx supabase db push --remote`. Check with `npx supabase migration list --remote`.
2. Then `git push origin main`. Vercel deploys every push to `main`.

First-time cloud setup (auth hook, SMTP, cron secrets, push keys, Vercel variables) is the checklist in [`docs/SETUP.md`](docs/SETUP.md).

## Where things are

```
src/app/(student)   dashboard, eligibility check, applications, alerts
src/app/(staff)     coordinator and admin: overview, listings, questions, announcements
src/app/(admin)     admin only: users, audit log
src/app/(auth)      sign-in, sign-up, password reset
src/lib             data access, server actions, eligibility, email, notifications, validation
supabase/           migrations, seed, pgTAP tests
e2e/                Playwright specs, one per requirement (4.1–4.13)
```

## Docs

- [`docs/SETUP.md`](docs/SETUP.md): local and cloud setup, with the checklist.
- [`docs/setup-smtp.md`](docs/setup-smtp.md): Gmail SMTP and the branded auth emails.
- [`docs/permissions.md`](docs/permissions.md): what each role can do, and where it's enforced.
- [`docs/notifications.md`](docs/notifications.md): reminders, email, push, and the cron jobs.
- [`docs/caching.md`](docs/caching.md) and [`docs/performance.md`](docs/performance.md): what's cached and how it's invalidated; indexes and `EXPLAIN ANALYZE` results.
- [`docs/data-retention.md`](docs/data-retention.md): what deleting an account removes and keeps.
- [`docs/REPORT.md`](docs/REPORT.md): the final report (what was built, what's deferred, what's left to do by hand).
- [`DESIGN.md`](DESIGN.md) and [`PRODUCT.md`](PRODUCT.md): the design system and product context.
