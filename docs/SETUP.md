# Setup

The manual steps to run Iskolar locally and on Supabase cloud. Secrets go in `.env.local` (git-ignored, see `.env.example`), never in chat or in git.

## Local development

1. Install Node 22+ and Docker Desktop, and start Docker.
2. `npm install`
3. `npx supabase start` starts the local stack (Postgres, Auth, Mailpit at <http://127.0.0.1:54324>). `npx supabase status` prints the local URL and keys.
4. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` from `npx supabase status` (the legacy names `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` also work).
   - `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM_NAME`, `APP_URL=http://localhost:3000` (see `docs/setup-smtp.md`). The server won't start without them.
5. `npm run db:reset` applies every migration in `supabase/migrations/` plus `supabase/seed.sql`.
6. `npm run seed:admin -- you@example.com "Your Name"` creates the first admin and prints a one-time password.
7. `npm run dev`, then open <http://localhost:3000>.

Locally, Supabase Auth emails (sign-up confirmation, password reset) go to Mailpit, not Gmail.

## Supabase cloud project

Do these in order. Steps 2–4 must be finished **before anyone signs in**.

### 1. Apply the migrations and the seed

Apply every file in `supabase/migrations/` in filename order, then `supabase/seed.sql`. Either:

- **Supabase CLI** (keeps the remote migration history identical to the repo):
  ```bash
  npx supabase login
  npx supabase link --project-ref <project-ref>
  npx supabase db push            # add --include-seed to load supabase/seed.sql too
  ```
- **Supabase MCP connector**: `apply_migration` for each file in order, then run `seed.sql`. Note that `apply_migration` stamps each migration with the time it runs, so the remote versions won't equal the repo filenames.

### 2. Enable the Custom Access Token hook

**When:** right after the migrations are applied (the function `public.custom_access_token_hook` comes from `20261103000900_auth_hook.sql`, so it must exist first), and before anyone, especially staff, signs in. Without the hook, tokens carry no `app_role` claim. Middleware then treats everyone as a student, and coordinators and admins get 403 on their pages until they sign in again after the hook is on.

**How:**
1. Dashboard → your project → **Authentication** → **Auth Hooks** (under *Configuration*).
2. **Add hook** → **Customize Access Token (JWT) Claims hook**.
3. **Hook type:** Postgres. **Schema:** `public`. **Function:** `custom_access_token_hook`.
4. **Create hook**, and make sure it shows as enabled.
5. Check it: sign in, then in the browser's dev tools decode the `sb-…-auth-token` cookie's access token at <https://jwt.io>. It should contain `"app_role": "student"`, or `"admin"` for an admin.

The migration already grants `supabase_auth_admin` what the hook needs (execute on the function, select on `profiles` through an RLS policy). Sessions that existed before the hook was enabled pick up the claim at their next token refresh (within an hour) or on the next sign-in.

### 3. Email (Gmail SMTP and templates)

Follow `docs/setup-smtp.md`: App Password, **Authentication → Emails → SMTP Settings** (port 465), the three branded templates, and **URL Configuration** (Site URL and Redirect URLs).

### 4. Auth settings

**Authentication → Sign In / Providers → Email**:
- **Confirm email**: on.
- **Minimum password length**: 8. **Password requirements**: lowercase, uppercase letters and digits. These match the app's password rules.

### 5. First admin

With `.env.local` pointing at the cloud project (`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`), run:

```bash
npm run seed:admin -- you@example.com "Your Name"
```

### 6. Scheduled reminders (`pg_cron` + `pg_net`)

The migrations enable both extensions and create two jobs: `iskolar-daily-reminders` queues deadline reminders at 07:00 Manila time (pg_cron runs in UTC, so it's scheduled `0 23 * * *`), and `iskolar-dispatch` runs every 10 minutes. The dispatch job calls the app's `/api/cron/dispatch` route (a Next.js route handler, the brief's alternative to an Edge Function), which sends the email and push. The jobs need two Vault secrets. Until those exist, they do nothing.

1. Pick a long random `CRON_SECRET` (16+ characters) and set it in Vercel (step 8).
2. In the Supabase SQL editor:
   ```sql
   select vault.create_secret('https://<your-vercel-domain>', 'iskolar_app_url');
   select vault.create_secret('<same value as CRON_SECRET>', 'iskolar_cron_secret');
   ```
3. Check: `select jobname, schedule, active from cron.job;` lists both jobs. Details, troubleshooting and limits are in `docs/notifications.md`.

### 7. Web push (VAPID keys)

`npx web-push generate-vapid-keys` prints a key pair. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in Vercel. Without them, the push option shows as unavailable and everything else works.

### 8. Vercel

1. Import the GitHub repo as a Vercel project (framework: Next.js; no build settings to change). Every push to `main` deploys.
2. **Settings → Environment Variables** (Production, and Preview if you use it). The names are in `.env.example`:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project settings → API Keys |
   | `SUPABASE_SECRET_KEY` | Same page. Server only; never expose it in client code |
   | `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM_NAME` | `docs/setup-smtp.md` |
   | `APP_URL` | `https://<your-vercel-domain>` (links in emails) |
   | `CRON_SECRET` | Step 6 |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Step 7 |
   | `EMAIL_DAILY_LIMIT` | Optional. Default 450 (Gmail allows about 500 a day; Google Workspace 2,000) |

   Don't set `EMAIL_DEV_SMTP` in Vercel. It's for local testing only.
3. Add the Vercel domain to Supabase **Authentication → URL Configuration** (Site URL and Redirect URLs). See `docs/setup-smtp.md`.
4. Redeploy after changing variables. They're read at build and start.

## Checklist

Tick these off for a new environment. Steps 2–4 must be done before anyone signs in.

- [ ] Supabase project created; migrations and seed applied (step 1)
- [ ] Custom Access Token hook enabled (step 2)
- [ ] Gmail App Password, SMTP settings, the three email templates, Site URL and Redirect URLs (step 3, `docs/setup-smtp.md`)
- [ ] Confirm email on; password rules set (step 4)
- [ ] First admin created (step 5)
- [ ] Vault secrets for the cron jobs; both jobs listed in `cron.job` (step 6)
- [ ] VAPID key pair (step 7)
- [ ] Vercel project and environment variables; Vercel domain in Supabase URL Configuration (step 8)
- [ ] Smoke test: sign up with a real address, confirm by email, finish the eligibility check; sign in as the admin and open `/admin/audit`
