# Setup

The manual steps to run Iskolar locally and on Supabase cloud. Secrets go in `.env.local` (git-ignored, see `.env.example`), never in chat or in git.

## Local development

1. Install Node 22+ and Docker Desktop, and start Docker.
2. `npm install`
3. `npx supabase start` starts the local stack (Postgres, Auth, Mailpit at <http://127.0.0.1:54324>). `npx supabase status` prints the local URL and keys.
4. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from `npx supabase status`.
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

With `.env.local` pointing at the cloud project (its URL and service-role key), run:

```bash
npm run seed:admin -- you@example.com "Your Name"
```

### Still to come (later phases)

- `pg_cron` + `pg_net` and the reminder Edge Function, with its secrets (Phase 6)
- VAPID keys for web push (Phase 6)
- Vercel environment variables (Phase 9)
