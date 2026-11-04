# Progress

| Phase | Status |
|---|---|
| 1 Foundation, 1b Email pipeline, 2 Database, 3 Auth, 4 Student, 5 Staff/admin | Done and deployed |
| 6 Notifications | Done and deployed |
| 7 Performance | Done and deployed |
| 8 Polish/QA | In progress: stage 1 and stage 2 groups 1–2 live; groups 3–4 next |
| 9 Tests + docs | To do |

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

## Phase 7: performance (done and live)

Details are in `docs/performance.md`. The dataset was 5,009 listings, 2,085 students, 50,300 alerts and 100,000 audit entries (`scripts/synth.sql`), with plans from `scripts/explain.sql`.

- Explore, the dashboard and eligibility counts went from 0.7–0.9 s to 30–76 ms. A fast inlinable eligibility tally replaces the per-listing explainable items, which are now built only for the page shown.
- `staff_overview` went from 250 to 13–18 ms and `listing_stats` from 161 to 9–14 ms, because `today_ph` and `scholarship_status` are now inlinable.
- The deep audit-log page went from 83 to 0.4 ms with a sargable keyset filter in `listAudit`.
- Announcement fan-out went from 282 to 58–77 ms and new-match alerts from 72 to 5 ms, with a set-based `notify_many`.
- Trade-off: the daily reminder job went from 121 to about 340 ms (585 reminders) and was kept. See the doc.
- Tests: pgTAP `90_performance` (the tally matches the explainable items for 40,000+ combinations; a planted bug fails it), 247 assertions in total; a keyset paging check added to E2E 4.5; 56 of 56 E2E pass.

## Phase 8: polish/QA (in progress)

1. **Sample listings (done and live; migration `20261104010000_sample_listings` pushed).**
   - A "Sample listing" badge appears on cards and detail pages, and samples are never shown as verified.
   - Landing numbers count samples separately.
2. **Impeccable pass, stage 1: dashboard and Find scholarships (done and live, `7bad2d3`).**
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
3. **Stage 2, group 1: landing, scholarship detail, help (done and live, `ee3de05`).**
   - Critique scores: landing 22/32, detail 28/40, help 28/40, with 4 P1 issues. The user chose sign-up-first prompts, a verdict preview and a status line on the detail page.
   - **Landing:**
     - An example explained verdict, built from the real requirement rows and labelled as an example, replaces the generic strip.
     - "Create an account to check" replaces the eligibility link that hit sign-in.
     - The tinted circle is gone, spacing is on the scale, and the chips meet the touch-target size.
   - **Detail page:**
     - The verdict pill comes first, the dates sit above the actions, and "Time left" follows the urgency ladder.
     - While preparing with documents missing, the page shows "N documents left · closes in X" with "See what's missing"; "Mark as submitted" is outline until everything is ticked.
     - The reminder copy reflects what the 07:00 job will actually do.
     - Sign-up-first prompts, and "All scholarships" as the back link.
   - **Help:**
     - "Ask a scholarship coordinator" jumps to the form, and the form comes first on narrow screens.
     - The page says who answers questions.
     - FAQ answers link to settings and the eligibility check, and have ids for deep links.
     - Visitors are offered sign-up first, and replies are no longer green.
   - **Shared:** "You meet both requirements", notices capped at 70ch, and four-letter provider marks fit the compact tile.
   - E2E: 57 of 57 pass. Some runs failed only under heavy memory pressure from other apps on the machine, confirmed by rerunning the same test on the previous commit and on this one.
4. **Stage 2, group 2: eligibility check, results, My applications, alerts, settings (done, pushed `90c0ff1`).**
   - Critique scores out of 40: wizard 26, results 26, applications 22, alerts 27, settings 20. Snapshots are in `.impeccable/critique/`.
   - The user chose: a summary, "Answer now" and a collapsed "Not eligible" on results; one next-step button with a confirmed Remove on applications; a settings hub without account self-delete; no per-row selection on alerts.
   - **Wizard:**
     - Errors are announced through a live summary, and focus moves to the first problem.
     - Answers survive a failed step.
     - Back saves before going back, and steps can be jumped to.
     - The copy says which answers are needed, and 4Ps and OFW are explained.
   - **Results:**
     - A summary sentence and the full basis, including family answers.
     - The disclaimer stays, quieter.
     - "Answer now" for each missing question.
     - "Not eligible" collapsed, closed listings removed, and an empty state.
   - **My applications:**
     - Each row has one next-step button and a "Still need: …" line with a checklist link.
     - Results show as pills.
     - Remove asks for confirmation, because it clears the ticked documents.
   - **Alerts:**
     - Per-row selection is gone; "Mark all as read" and mark-on-open remain.
     - Icons are neutral, and only deadline urgency is coloured.
     - A reminder summary links to Settings.
   - **Settings (`/settings`):**
     - Sections for account, eligibility answers (per-step Edit, and delete with confirmation) and reminders.
     - Linked from the account menu. `/settings/notifications` redirects there, so email links still work.
   - **Text buttons:** 14px, with a 44px touch target below 900px.
   - Tests: 57 of 57 E2E pass, including new checks that a failed wizard step keeps picks and focuses the error, that the "Still need" line shows, and that Remove asks first.
5. **Next: stage 2, group 3 (sign-in pages), then group 4 (staff and admin screens).**

## Open issues

- **GitHub Actions CI failure on `main`:** not yet investigated. The repo is private and there's no `gh` CLI on this machine.
- **One-off pgTAP failure from Phase 6:** not reproduced. Listed for Phase 9.
- **`npm audit`:** reports `postcss` bundled in Next.js (high). Needs a Next upgrade, listed for Phase 9.
- **E2E on this machine:** clear `.next/cache/fetch-cache` before full runs. Tests can time out under memory pressure from other apps, so rerun before treating a failure as real.
- **Detector agents:** deleting a test auth user leaves its profile tombstone, which is by design. Critique agents now also delete those profile rows.
