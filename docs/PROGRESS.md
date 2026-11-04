# Progress

| Phase | Status |
|---|---|
| 1 Foundation, 1b Email pipeline, 2 Database, 3 Auth, 4 Student, 5 Staff/admin | Done and deployed |
| 6 Notifications | Done and deployed |
| 7 Performance | Done locally; migration `20261104000100_performance` not pushed yet |
| 8 Polish/QA, 9 Tests + docs | To do |

## Phase 6: notifications (done)

Details and setup are in `docs/notifications.md`.

- **Database** (`supabase/migrations/20261103170000_notifications.sql`):
  - `notify()` applies preferences, and each alert's dedupe key means a trigger or job can never create it twice.
  - Triggers create alerts for deadline reminders (daily job), deadline and requirement changes, new matching listings and announcements.
  - `claim_notifications()` leases rows to the dispatcher for 10 minutes.
  - `call_dispatch()` uses `pg_net`, with the URL and secret read from Vault.
  - `pg_cron` runs reminders daily at 07:00 Manila and delivery every 10 minutes.
  - `notifications` is in the Realtime publication.
- **Delivery:** `POST /api/cron/dispatch` (Bearer `CRON_SECRET`, compared in constant time) runs `src/lib/notifications/`.
  - Email goes through `src/lib/email`, with a new requirements-changed template.
  - Preferences and account status are re-checked at send time.
  - Each email gets up to 3 attempts, and errors are logged.
  - Daily budget: `EMAIL_DAILY_LIMIT`, default 450.
  - Web push uses `web-push`; subscriptions that come back 404 or 410 are removed.
- **Student UI:**
  - `/alerts`: All / Unread tabs, select or mark all as read (one RPC transaction), and the reminder-settings form. Opening an alert goes through `/alerts/[id]`, which marks it read and redirects.
  - `/settings/notifications`: the same form, and the target of every email's preferences link.
  - Live bell badge: server count, then Realtime.
  - The dashboard no longer shows announcements twice.
  - Push permission is asked only after the student turns push on and saves.
- **Local email:** `EMAIL_DEV_SMTP` (loopback only) sends to Mailpit, so tests never touch Gmail.
- **Tests:**
  - pgTAP `80_notifications` (35 assertions; 236 in total).
  - Vitest for the dispatcher and the dev SMTP setting (46 in total).
  - E2E `4.7-notifications`: cron endpoint auth; reminder → email in Mailpit with the preferences link → live badge → mark read → open the alert; email-off preference respected.
  - axe on `/alerts` and `/settings/notifications`.
  - Full E2E suite: 56 of 56 pass on a production build.
  - Also verified by hand: Postgres → Vault → `pg_net` → endpoint returned 200 and delivered the queued emails locally.
- **Not covered by E2E:** real push delivery, because headless Chromium has no push service. The sending logic is unit-tested.
- **Unexplained:** one pgTAP run failed once and couldn't be reproduced (8 passing runs since). The claim test now ignores other local rows, which removes one possible cause.

## Local dev notes

- `.env.local` is never created, read or edited by the assistant; it holds the real Gmail credentials. Local push keys and `CRON_SECRET` are passed as environment variables when the server starts.
- Local Vault needs `iskolar_app_url = http://host.docker.internal:3000` and `iskolar_cron_secret` (see `docs/notifications.md`).
- `npm audit --omit=dev`: 1 high and 1 moderate in the `postcss` bundled inside Next.js. This was already on main and is not from Phase 6. The offered fix needs `--force`; revisit when upgrading Next.

## Phase 9 additions (from the user)

- Investigate the one-off pgTAP failure seen during Phase 6 (not reproduced; see above).
- Upgrade Next.js to clear the `postcss` audit warning from its bundled copy.
- Phase 6 confirmed on the cloud by the user: both cron jobs active, and the dispatch job runs (skipping the HTTP call when nothing is pending).

## Phase 7: performance (done locally)

Details are in `docs/performance.md`. The dataset was 5,009 listings, 2,085 students, 50,300 alerts and 100,000 audit entries (`scripts/synth.sql`), with plans from `scripts/explain.sql`.

- Explore, the dashboard and eligibility counts went from 0.7–0.9 s to 30–76 ms. A fast inlinable eligibility tally replaces the per-listing explainable items, which are now built only for the page shown.
- `staff_overview` went from 250 to 13–18 ms and `listing_stats` from 161 to 9–14 ms, because `today_ph` and `scholarship_status` are now inlinable.
- The deep audit-log page went from 83 to 0.4 ms with a sargable keyset filter in `listAudit`.
- Announcement fan-out went from 282 to 58–77 ms and new-match alerts from 72 to 5 ms, with a set-based `notify_many`.
- Trade-off: the daily reminder job went from 121 to about 340 ms (585 reminders) and was kept. See the doc.
- Tests: pgTAP `90_performance` (the tally matches the explainable items for 40,000+ combinations; a planted bug fails it), 247 assertions in total; a keyset paging check added to E2E 4.5; 56 of 56 E2E pass.

## Phase 8: polish/QA (in progress)

1. **Sample listings (done; migration `20261104010000_sample_listings` not pushed yet).**
   - A "Sample listing" badge appears on cards and detail pages, and samples are never shown as verified.
   - Landing numbers count samples separately.
2. **Impeccable pass, stage 1: dashboard and Find scholarships (done).**
   - Critique: two isolated review agents; scores 26/40 and 27/40, with 4 P1 and 5 P2 issues. Snapshots are in `.impeccable/critique/`.
   - The user chose a "Do this next" list, a scrolling chip row, and all P1 and P2 fixes.
   - **Dashboard:**
     - One "Do this next" list, soonest deadline first. It includes unsaved matches that close within 7 days, each with a Save action. The next missing document is shown inline, each scholarship appears only once, and the list shows 3 rows with a "Show N more" disclosure.
     - An act-now band and an FYI band, separated by a rule; "Recommended" no longer repeats rows from "Do this next".
     - Tinted icon circles and the stat strip are removed; there is one progress meter per application.
     - Spacing is on the DESIGN.md scale, section headings are 20px, and touch targets are at least 44px.
   - **Find scholarships:**
     - On phones the search field has no button, the filters are one scrolling chip row, and sort sits in the results line.
     - The "Check what I qualify for" chip is replaced by a sentence link.
     - Cards put the verdict next to the deadline and give a reason for "Not eligible right now" and "Might qualify". The provider-type badge is gone, and "Posted" shows only when sorting by newest.
     - The detail panel shows its notice under the dates and has a pinned "Open the full page" footer.
     - The results list gets an `h2`; header and footer links meet the touch-target size.
   - Checks: the detector is clean (only the documented 11px exception), there's no horizontal overflow at 360px, and 57 of 57 E2E tests pass.
   - Before/after screenshots: `docs/screenshots/phase8-before/` and `docs/screenshots/phase8-after/`.
3. **Next, stage 2:** the same pass for the landing page, scholarship detail, eligibility wizard and results, applications, alerts and settings, help, sign-in pages, and staff and admin screens.
