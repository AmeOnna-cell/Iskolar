# Progress

Phases 1–5 are done and deployed: main `e77d75a`, cloud migrations up to `20261103160000`.
**Phase 6 (notifications) is in progress on branch `phase-6-wip`. Nothing from it is pushed or deployed.**

## Phase 6: done

- **Migration `supabase/migrations/20261103170000_notifications.sql`** (local only; NOT pushed to the cloud):
  - `notifications.payload` (data for the templates) and `claimed_at` (lease for the dispatcher), plus a partial index on rows still waiting to be delivered.
  - `notifications` added to the `supabase_realtime` publication, for the live unread badge.
  - `notify()` is the single place that applies preferences:
    - It skips a kind when that topic is switched off (`new_matches`, `changes`).
    - With on-site alerts off, the row is stored already read, so it never lights the badge.
    - It sets `email_status` and `push_status` to pending or skipped.
    - The dedupe key (unique per user) makes every trigger idempotent.
  - The four triggers from brief §4.7:
    - (a) `enqueue_deadline_reminders()`: saved or preparing applications that close within the student's lead time. One reminder per student × listing × deadline × lead time. The body says how many documents are still unchecked.
    - (b) Changes: a deadline change (from `deadline_changes`, which also sets `notified_at`), or a criteria or document edit on a published listing. At most one requirements alert per listing per day.
    - (c) New match: a listing becomes published → every active student whose verdict is yes or maybe.
    - (d) Announcement: posting one notifies every active student.
  - `claim_notifications(limit)`, service role only. It claims rows most urgent first and uses `skip locked` with a 10-minute lease.
  - `call_dispatch()`: `pg_net` POSTs to `<app>/api/cron/dispatch` with a Bearer secret. Both values come from **Vault**, never from the migration. It does nothing when no rows are pending or the secrets aren't set.
  - `pg_cron` jobs:
    - `iskolar-daily-reminders` at `0 23 * * *` (07:00 Manila): enqueue reminders, then dispatch.
    - `iskolar-dispatch` every 10 minutes (no-op when idle).
  - Every new function is revoked from `anon` and `authenticated`.
- `supabase/config.toml`: Mailpit's SMTP port `54325` exposed (local only), so the app's own emails can be tested locally without Gmail.

## Phase 6: half-done or not verified

- The migration **applies cleanly locally** (`npx supabase migration up`). Both cron jobs are scheduled, `notifications` is in the Realtime publication, and the existing 201 pgTAP assertions still pass. The triggers themselves are **not exercised by any test yet**.
- No pgTAP tests yet (planned file `supabase/tests/80_notifications.test.sql`). It should cover:
  - preferences respected, and on-site off means stored as read;
  - re-running reminders or a trigger creates no duplicates;
  - each trigger (a)–(d);
  - the claim lease;
  - students can't call `notify`, `claim_notifications` or `enqueue_deadline_reminders`, or insert notifications;
  - `notifications` is in the Realtime publication.
- `database.types.ts` not regenerated (`npx supabase gen types typescript --local > src/lib/supabase/database.types.ts`).

## Phase 6: next (in order)

1. **Mailer dev override** in `src/lib/email/env.ts`: optional `EMAIL_DEV_SMTP=127.0.0.1:54325`, accepted only for localhost or 127.0.0.1 (plain SMTP, no auth), so E2E emails land in Mailpit. Everything else keeps using Gmail on port 465. Reuse `src/lib/email`; don't build a second mailer.
2. **Requirements-changed email template** in `src/lib/email/templates.ts`. Deadline reminder, deadline moved, new match and announcement templates already exist; they're fed from `payload`.
3. **Dispatcher**: `src/lib/notifications/dispatch.ts` (senders injected so it can be unit-tested) and `src/app/api/cron/dispatch/route.ts`.
   - The route accepts POST only, compares `Authorization: Bearer ${CRON_SECRET}` in constant time, and returns 503 when CRON_SECRET isn't set.
   - It re-checks preferences and account status at send time.
   - Email: up to 3 attempts, logging `email_error`. **Daily budget ≈ 450** to stay under Gmail's ~500/day; the rest wait for the next day.
   - Push via the `web-push` npm package (needs `npm i web-push @types/web-push`). A 404 or 410 response deletes the dead subscription.
   - Reminder emails recompute "days left" at send time and are skipped if the listing has already closed.
4. **Alerts page** (`src/app/(student)/alerts/page.tsx`, currently a placeholder):
   - All / Unread tabs via `?show=unread`, with server pagination.
   - Icon per kind, as in the prototype `.note` styles.
   - Row checkboxes with "Mark selected as read" and "Mark all as read", through the existing `mark_notifications_read` RPC.
   - Opening an alert goes through `/alerts/[id]`, which marks it read and then redirects. Use a plain `<a>`, not a prefetched Link.
   - The reminder-settings form sits in the sidebar, as in the prototype.
5. **Reminder settings** (`/settings/notifications`, currently a placeholder): email, push and on-site switches; lead time 1/3/7/14 days; new matches; changes. Saved through a server action. Every email's preferences link already points here.
6. **Web push**:
   - A service worker at `public/sw.js` handles `push` and `notificationclick`.
   - The permission prompt appears only when the student turns push on in settings and saves, never on page load.
   - Subscriptions are saved and removed through server actions (zod-validated).
   - If `NEXT_PUBLIC_VAPID_PUBLIC_KEY` isn't set, the push option is disabled with a short note.
7. **Live unread badge**:
   - The root layout fetches the unread count for students. The header currently always gets 0.
   - A small client component subscribes to Realtime `postgres_changes` on `notifications` (`user_id=eq.<id>`) and re-counts on each change.
8. **Tests**:
   - pgTAP (above) and Vitest for the dispatcher (mocked senders, budget, retries, skipped prefs).
   - E2E `e2e/4.7-notifications.spec.ts`:
     - Save a listing → run the reminders through the service role → call the dispatch route with the secret → the email appears in Mailpit with a preferences link → the badge counts → Alerts → mark read.
     - An announcement reaches Alerts.
     - Turning email off means nothing is sent.
   - Add `/alerts` and `/settings/notifications` to `a11y.spec.ts`.
9. Screenshots at 360/768/1280/1440 in both themes. Then `docs/notifications.md` covering setup, Vault commands and the Gmail budget.
10. Commit, then **ask before** `npx supabase db push --remote --yes` and merging or pushing to main. The migration has to go before the code deploy.

## What I need from you (before Phase 6 is deployed, not before work resumes)

1. **VAPID key pair for web push.** Generate one with `npx web-push generate-vapid-keys` and add it in Vercel → Settings → Environment Variables:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = the public key
   - `VAPID_PRIVATE_KEY` = the private key (server only)

   The duplicate `VAPID_PUBLIC_KEY` line in `.env.example` will be removed; the server reads the public key from the `NEXT_PUBLIC_` variable.
2. **`CRON_SECRET`**: a long random string, for example `openssl rand -hex 32`. Put the same value in two places:
   - Vercel env var `CRON_SECRET`;
   - Supabase Vault, in the SQL editor of project gfiutwubhsnpgkaflpuh:
     ```sql
     select vault.create_secret('https://iskolar-ochre.vercel.app', 'iskolar_app_url');
     select vault.create_secret('<the same CRON_SECRET>', 'iskolar_cron_secret');
     ```
   Until both secrets exist, the cron jobs run but send nothing.
3. **Still pending from earlier phases:** paste the generated Supabase Auth email templates (`supabase/templates/*.html`) into the cloud project (Authentication → Email Templates).

No new names are needed beyond these. The email settings (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM_NAME`, `APP_URL`) are reused as they are.
