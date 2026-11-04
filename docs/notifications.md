# Notifications and reminders

Students get alerts on the site (the bell and the Alerts page), by email (Gmail SMTP through
`src/lib/email`) and, if they opt in, by web push. They choose channels, lead time and topics on
the Alerts page or at `/settings/notifications`, which every email links to.

## How it works

```
event (trigger or daily job) ──► public.notify() ──► notifications row (dedupe_key unique per user)
                                                      │  email_status / push_status = pending
pg_cron every 10 min ──► public.call_dispatch() ──► pg_net POST /api/cron/dispatch (Bearer CRON_SECRET)
                                                      │
                              claim_notifications() ──► email (src/lib/email) + web push ──► sent / failed
```

The database decides who is told what: `supabase/migrations/20261103170000_notifications.sql`.

| Kind | When | Who | Dedupe key (no duplicates, ever) |
|---|---|---|---|
| Deadline reminder | Daily job, 07:00 Manila (`enqueue_deadline_reminders`) | Saved or preparing applications closing within the student's lead time (1/3/7/14 days); the text includes how many documents are still unchecked | `deadline:{listing}:{closes_on}:{lead_days}` |
| Deadline moved | A deadline change on a published listing | Students tracking it (saved or preparing), if "changes" is on | `change:{listing}:deadline:{new date}` |
| Requirements updated | Criteria or document list edited on a published listing | Same; at most one per listing per day | `change:{listing}:requirements:{day}` |
| New scholarship | A listing becomes published | Students whose eligibility verdict is yes or maybe, if "new matches" is on | `new:{listing}` |
| Announcement | An announcement is posted | Every active student | `announce:{id}` |

`notify()` is the only place that reads preferences:
- Topics switched off create nothing.
- With on-site alerts off, the row is stored already read, so the bell never counts it.
- Email or push off means that channel is `skipped`.
- Staff and deactivated accounts never get alerts.

The dispatcher (`src/lib/notifications/`) re-checks preferences and account status when sending:
- **Email:** each email gets up to 3 attempts, and each attempt also retries temporary SMTP errors. Failures are kept in `notifications.email_error` and logged as `notifications.delivery_failures`.
- **Deadline reminders** recompute "days left" at send time, and aren't sent once the deadline has passed.
- **Daily budget:** at most `EMAIL_DAILY_LIMIT` emails per rolling 24 hours (default 450), because Gmail allows about 500 a day per account and Supabase's sign-up and password emails share it. Anything over the budget waits, deadline reminders first.
- **Push:** sent to every device the student subscribed. A 404 or 410 from the push service deletes that subscription.
- **Overlapping runs:** a claimed row is leased for 10 minutes, so two runs never send the same alert.

The bell starts from the server's count and follows Realtime changes. `notifications` is in the
`supabase_realtime` publication, and RLS means each student only receives their own rows.

## Setup (cloud)

1. **Vercel** environment variables:
   - `CRON_SECRET`: 16 or more random characters.
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`: from `npx web-push generate-vapid-keys`.
   - The email variables from `docs/setup-smtp.md`.
2. **Supabase Vault**, in the SQL editor:
   ```sql
   select vault.create_secret('https://iskolar-ochre.vercel.app', 'iskolar_app_url');
   select vault.create_secret('<same value as CRON_SECRET>', 'iskolar_cron_secret');
   ```
   To change one later: `select vault.update_secret((select id from vault.secrets where name = 'iskolar_cron_secret'), '<new>');`
3. `npx supabase db push --remote` creates the cron jobs. Until the Vault secrets exist they do nothing.

Check it's working (SQL editor):
```sql
select jobname, schedule, active from cron.job;                       -- iskolar-daily-reminders, iskolar-dispatch
select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
select status_code, content, error_msg from net._http_response order by created desc limit 5;
select email_status, count(*) from public.notifications group by 1;   -- pending should drain within ~10 minutes
```

## Local development

- Mail goes to Mailpit (http://127.0.0.1:54324) when `EMAIL_DEV_SMTP=127.0.0.1:54325` is set. Only a loopback address is accepted, so this can't redirect production mail.
- Local Vault secrets point the cron at your dev server:
  ```sql
  select vault.create_secret('http://host.docker.internal:3000', 'iskolar_app_url');
  select vault.create_secret('<your local CRON_SECRET>', 'iskolar_cron_secret');
  ```
- Run the reminder job now: `select public.enqueue_deadline_reminders();`.
- Deliver now: `select public.call_dispatch();`, or `curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/dispatch`.
- Push needs HTTPS (or localhost) and a browser with a push service. Headless test browsers usually have none, so push delivery is covered by unit tests (`src/lib/notifications/dispatch.test.ts`), not E2E.

## Limits and upgrade paths

- New-match and announcement fan-out runs inside the publishing or posting transaction: O(students). That's fine for a campus. Move it to a queued job if publishing gets slow (marked `ponytail:` in the migration).
- Gmail's daily cap is the real ceiling for email. Raise `EMAIL_DAILY_LIMIT` only after moving to Workspace or a transactional provider.
- Alerts are kept until the account is deleted (`docs/data-retention.md`).
