# Progress

| Phase | Status |
|---|---|
| 1 Foundation, 1b Email pipeline, 2 Database, 3 Auth, 4 Student, 5 Staff/admin | Done and deployed |
| 6 Notifications | Done and deployed |
| 7 Performance | Done and deployed |
| 8 Polish/QA | Done and deployed |
| 9 Tests + docs | Done and deployed (2026-11-08); see `docs/REPORT.md` |
| Privacy note and `/privacy` | Done and deployed (`7ebb48a`) |
| Team-leader revisions (groups A–F) | In progress: A and B pushed (`976d79d`); C migration pushed, C code committed |

## Team-leader revisions (started 2026-11-08)

Brief: `C:\Users\TUF DASH\Downloads\REVISIONS_PROMPT.md` (outside the repo). Groups A–F in order. Each group gets tests on a reset DB, screenshots at 4 sizes × 2 themes, one critique, a commit, and then the user is asked before pushing. Rules: DESIGN.md and taste dials 3/3/4. Phones get smaller type and less vertical space, but inputs stay ≥16px and body text ≥14px. Keep the Sample listing badge, the verdicts and the "preliminary check" wording. New drawers and dialogs need a focus trap, Esc, focus return, and URL state so Back closes them.

### Group A: quick fixes (pushed, `77783d7`)
- **Sticky header in the Find scholarships side panel:** logo, name, provider, location, pills and actions stay in view (`DetailBody compact`). The panel has `scroll-pt-56`, so focused content isn't hidden under it.
- **Share** (`components/scholarship/share-button.tsx`): Web Share API, else copy the link with a "Link copied" toast. It's in the side panel and on `/s/[slug]`; the My applications detail gets it in group E. Sample listings share as "Name (sample listing)", and `/s/[slug]` has Open Graph tags that lead with "Sample listing · Deadline …".
- **Dashboard greeting on phones:** 18px greeting, the fact at 14px medium, the date at caption size, less padding. Recorded as a DESIGN.md exception.
- **Dashboard button:** answered → "See my eligibility results" (`/check/results`); not answered → "Check my eligibility" (`/check`). Unit-tested in `dashboard.test.ts`.
- **My applications tabs:** the stray vertical scrollbar came from `-mb-px` overflowing an `overflow-x-auto` row. Now an inset-shadow hairline, `overflow-y-hidden` and a hidden scrollbar. On phones a right-edge fade shows that the cut-off "Results" tab is there.
- **Phone footer:** one short line and a 2-column link grid (44px rows).
- **Combobox** (`components/ui/combobox.tsx`, ARIA APG list autocomplete, no dependency):
  - Used for course area and region (wizard, landing hero), provider and coordinator (listing editor), scholarship (announcements, Help question) and action (audit filter).
  - Searches the labels plus students' own words (`FIELD_OPTIONS` and `REGION_OPTIONS` in `lib/reference.ts`: degrees, cities, provinces).
  - Leaving the box with one match picks it. A miss shows "No matches for “X”" with the full list below.
  - z-40 above the tab bar. On touch the field scrolls to the top before opening; the list opens upward when there's no room below (also inside dialogs).
  - Find scholarships' own filter selects are left for group B, where they move into the filter drawer.
- **Critique:** dual-agent, 27/40 before fixes; snapshot in `.impeccable/critique/`. Four P1s fixed: search words, list placement on phones, hidden Results tab, sample label lost when shared. Kept as the leader specified, and raised with the user: the sticky header's contents, and comboboxes for course and region on phones.
- **Tests:** lint and typecheck clean, unit 50 of 50, pgTAP 247 of 247, E2E 77 of 77 on a reset DB. New `e2e/revisions-a.spec.ts`; `pickOption` helper in `e2e/support.ts`.
- **Screenshots:** `docs/screenshots/revisions-a/`.

### Group B: Find scholarships (pushed, `976d79d`)
- **Filter drawer** (`components/ui/drawer.tsx`, Radix): a bottom sheet under 640px and a right-hand side drawer above that.
  - Opened by the filter button next to the search, which shows the active-filter count.
  - Holds only the existing filters: "Only ones I qualify for", status, provider type and year as chip radios; course area and region as comboboxes.
  - The drawer edits a draft. "Done" applies it; "Clear all" resets it; Esc, X, the scrim and Back discard it.
  - Sort stays outside the drawer.
- **Drawer URL state** (`useUrlPanel`): `?filters=1`, so Back closes the drawer and a shared link reopens it. Focus returns to whatever opened it. Esc inside an open combobox list closes only the list (also in `Dialog`).
- **Applied filters by name** under the search box, each removable, plus "Clear filters". The empty state names the filters and offers "Clear filters" (keeps the search) and "Clear search" separately.
- **New card** (`components/scholarship/card.tsx`), everywhere cards appear (Find scholarships, eligibility results, dashboard recommendations, landing):
  - Mark and name with save at the top.
  - Amount at 20px/700 with its period (`splitAmount` in `lib/format.ts`, unit-tested).
  - Location (wraps; it can carry eligibility, e.g. "(city residents)") and a provider-type tag.
  - Verdict and trust pills.
  - A rule, then the deadline in its urgency colour and "Posted …".
  - The selected ring shows only from 1024px, where the side panel is.
- **Details drawer below 1024px:** a card tap pushes `?s=slug&d=1` and opens the details over the list. Back closes it with the scroll position and focus kept. The dialog is named by the scholarship, with a floating close button and an "Open the full page" link. From 1024px the side panel stays (DESIGN.md updated from 1000).
- **Fixes from the critique** (dual-agent, 27/40 before fixes, snapshot in `.impeccable/critique/`):
  - 7px of sideways scroll at 360 on `/explore` and `/`: the results grid had no column template below lg, so it sized to the cards' min-content.
  - Applied filters were invisible.
  - The first card looked selected on phones.
  - The details drawer had a doubled header.
  - Not changed, raised with the user: "Done" shows no result count before applying.
- **Tests:**
  - Lint and typecheck clean, unit 52 of 52, pgTAP 247 of 247.
  - E2E 86 of 86 on a reset DB. New `e2e/revisions-b.spec.ts`; `4.10` updated for the drawer.
  - Axe now also covers `/explore?filters=1` and `/explore?s=…&d=1` in both themes.
- **Screenshots:** `docs/screenshots/revisions-b/`.

### Group C: notifications and profile (migration pushed; code committed, not pushed)
- **Migration `20261108120000_self_delete.sql`** (pushed with `--remote` before the code; the remote migration list matches):
  - `anonymize_account()` holds the shared personal-data removal. No API role can execute it.
  - `admin_soft_delete_user()` keeps its guards (assert_admin, not yourself, never the last admin) and now calls the shared step.
  - `delete_my_account(email, password)` acts only on `auth.uid()`. It re-checks the email and the current password in the database (pgcrypto bcrypt) and allows 5 password tries an hour (a wrong password returns instead of raising, so the counter survives). It blocks the last active admin, audits `user.self_delete` and deletes the person's `auth.sessions`.
  - pgTAP `95_self_delete` has 34 assertions.
- **Bell dropdown** (`components/shell/alerts-bell.tsx`, Radix menu, non-modal):
  - The 10 latest alerts, unread marked by a wash, a dot, a bold title and sr-only text. Each item goes through `/alerts/[id]`, which marks it read.
  - "Mark all as read" keeps the menu open. The footer has "See all notifications" and "Reminder settings".
  - Full width on phones. The live count and list refresh through Realtime.
- **Account menu:** students get My profile, Edit eligibility answers, Help and FAQ, Sign out. Staff keep the office view and the audit log first. Both menus are non-modal and show a focus ring on the highlighted item.
- **My profile** (`/profile`, moved from `/settings`):
  - Sections: name, password (current plus new, signs out other devices), eligibility answers, reminders and delete account, with jump links under the heading.
  - `/settings` and `/settings/notifications` (the link in every email) redirect there, and the `#fragment` is kept.
  - Self-delete: a dialog asks for the email and current password and lists what is deleted and what is kept, with links to the privacy page and to reminders. The form resets each time the dialog opens. It ends on `/goodbye`.
  - `docs/data-retention.md` and `/privacy` now describe self-service deletion.
- **`Dialog` returns focus to its opener:** none of the app's dialogs had a Radix trigger, so focus fell to `<body>` on close. Fixed for all of them.
- **Critique:** dual-agent, 27/40 before fixes; snapshot in `.impeccable/critique/`. Fixed: dialog focus return, menu focus ring, reminders findability, stale delete dialog, goodbye CTA, the disabled push hint at 2.4:1. Left: urgency colours for deadline alerts in the bell.
- **Tests:** lint and typecheck clean, unit 52 of 52, pgTAP 281 of 281, E2E 91 of 91 on a reset DB. New `e2e/revisions-c.spec.ts` includes axe with the bell menu and the delete dialog open.
- **Screenshots:** `docs/screenshots/revisions-c/`.

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

- **Restarting `next start` locally:** a restart keeps `.next/cache/fetch-cache` but forgets tag revalidations made by the previous process, so pages can show stale data (for example the 4.9 spec's "(cache check)" amount). Clear `.next/cache/fetch-cache` before restarting. Vercel's shared data cache doesn't have this problem.

- `.env.local` is never created, read or edited by the assistant; it holds the real Gmail credentials. Local push keys and `CRON_SECRET` are passed as environment variables when the server starts.
- Local Vault needs `iskolar_app_url = http://host.docker.internal:3000` and `iskolar_cron_secret` (see `docs/notifications.md`).
- `npm audit --omit=dev`: 1 high and 1 moderate in the `postcss` bundled inside Next.js. This was already on main and is not from Phase 6. The offered fix needs `--force`; revisit when upgrading Next.

## Phase 9: tests and docs (done 2026-11-08)

Phase 6 was confirmed on the cloud by the user: both cron jobs are active, and the dispatch job runs (it skips the HTTP call when nothing is pending).

- **Back button in the listing editor:**
  - Back and Forward ask before leaving unsaved edits.
  - Next's popstate listener runs first in registration order, so an inline `<head>` hook (`src/lib/head-scripts.ts`) registers before hydration and asks the editor first.
- **Theme script:**
  - The saved theme was never applied before load. The `<head>` script had been a syntax error since Phase 1, because its string came from a `"use client"` module and the server saw a client reference.
  - It now lives in `head-scripts.ts`. `e2e/theme.spec.ts` checks it with the app bundles blocked.
- **Group 3 P3s:** the new-password page has no sign-up band (`AuthShell band={false}`), and the email gets its own line.
- **Privacy note on sign-up:** the `PRIVACY_NOTE` slot in `(auth)/forms.tsx` renders nothing until the user gives the wording.
- **npm audit, now 0:**
  - Next goes to 15.5.29. Every 15.x release pins postcss 8.4.31, so `overrides.next.postcss ^8.5.32` lifts it. Drop the override on Next 16.4.5+.
  - typescript-estree's minimatch is overridden to ^11.0.5. `npm audit fix` would have downgraded typescript-eslint to 6.15, which breaks ESLint 9.
- **One-off pgTAP failure, found:**
  - The seed's dates are relative to the reset day. From 3 days after a reset, `40_eligibility_search` #7 and `60_student_reads` #1 and #3 fail.
  - Reproduced by ageing the seeded rows (dates and `created_at`).
  - Both files now re-anchor the sample dates to today inside their own transaction.
  - 247 of 247 pass on a fresh DB and on DBs aged 7 and 30 days; 20 repeated runs also passed.
- **E2E coverage review:** there is now one spec per §4 concern. New: 4.4 (validation and question rate limit), 4.9 (caching), 4.11 (44px touch targets), 4.12 (one-column dashboard) and 4.13 (four sizes, tab bar, cards, sheets). Also new: signed-in visits to `/login` and `/signup` go home (4.8).
  - The new specs found two real bugs: `/staff/listings` scrolled sideways at 768 (the table now starts at 1024), and the "Rows" select and sort links were 36px on phones.
- **Docs:** README (run, scripts, deploy, layout, docs index), the SETUP checklist (cron/Vault, VAPID, Vercel variables, smoke test) and `docs/REPORT.md`.
- **Tests:** lint and typecheck clean, unit 50 of 50, pgTAP 247 of 247, E2E 69 of 69 on a reset DB.

## Phase 7: performance (done and live)

Details are in `docs/performance.md`. The dataset was 5,009 listings, 2,085 students, 50,300 alerts and 100,000 audit entries (`scripts/synth.sql`), with plans from `scripts/explain.sql`.

- Explore, the dashboard and eligibility counts went from 0.7–0.9 s to 30–76 ms. A fast inlinable eligibility tally replaces the per-listing explainable items, which are now built only for the page shown.
- `staff_overview` went from 250 to 13–18 ms and `listing_stats` from 161 to 9–14 ms, because `today_ph` and `scholarship_status` are now inlinable.
- The deep audit-log page went from 83 to 0.4 ms with a sargable keyset filter in `listAudit`.
- Announcement fan-out went from 282 to 58–77 ms and new-match alerts from 72 to 5 ms, with a set-based `notify_many`.
- Trade-off: the daily reminder job went from 121 to about 340 ms (585 reminders) and was kept. See the doc.
- Tests: pgTAP `90_performance` (the tally matches the explainable items for 40,000+ combinations; a planted bug fails it), 247 assertions in total; a keyset paging check added to E2E 4.5; 56 of 56 E2E pass.

## Phase 8: polish/QA (done)

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
5. **Stage 2, group 3: sign-in pages (done).**
   - Critique scores out of 40: login 28, signup 26, forgot password 27, new password 27, status pages 28.
   - The user chose all P1 and P2 fixes, form first on phones, no confirm-password field, and "Open Gmail" plus a hint on /check-email.
   - **Every auth form:**
     - After a failed submit, focus moves to the first invalid field, or else to the result message.
     - Field errors are summed up in an alert ("2 things to fix below.").
   - **Phones:** the navy band is hidden below `lg`, so the form opens the page.
   - **Header:** on /login, /signup, /check-email and /forgot-password, only the other page's link shows, as a quiet text link.
   - **Signup and new password:** the "type it again" field is removed, since the show-password toggle covers it.
   - **Signup:** the lead says the next step is confirming the email.
   - **/check-email:**
     - An "Open Gmail" button opens a subject search in a new tab, with a subject hint.
     - The address no longer breaks mid-word.
   - **Forgot password:** after sending, the form becomes a check-your-email state with a 60-second cooldown, so there are no accidental duplicate sends.
   - **New password:**
     - "Cancel, keep my password" link.
     - "Signed in as …" lead.
     - The "password updated" notice now also shows on /staff.
   - **/403:**
     - Copy per role; students are told staff accounts are set up by Iskolar.
     - Signed-out visitors get a Sign in button.
   - Tests: 57 of 57 E2E pass on a reset DB, with new checks for focus and the error summary, the Gmail link and the reset cooldown. The detector is clean.
   - Screenshots: `docs/screenshots/phase8-g3-before/` and `docs/screenshots/phase8-g3-after/`.
6. **Stage 2, group 4: staff and admin screens (done, committed 2026-11-08).**
   - Critique scores out of 40: overview 27, listings 25, editor 21, questions 28, announcements 25, users 22, audit 24. Snapshots are in `.impeccable/critique/`.
   - The user chose P0 + P1 + most P2, a work-queue overview, a confirm/undo split for consequential actions, and blocking the editor's status actions while there are unsaved changes.
   - **Shared:**
     - The account menu's focus ring shows again (`outline-none` was cancelling it).
     - The office band is a labelled region (axe `region`).
     - New `outline-danger` button variant, so Delete is red again.
     - Toasts can carry an Undo action (6 s).
     - New `CheckCell`: a 44px hit area for row checkboxes.
   - **/admin/users:**
     - Role change is a confirm dialog. It was a select that committed on every change, so an arrow key promoted a user (P0).
     - Deactivate offers Undo.
     - Rows line up in columns, and emails wrap.
   - **Listing editor:**
     - Unsaved-changes guard on links and tab close.
     - Status actions are disabled until the form is saved.
     - Publish and Unpublish confirm first; archiving a live listing offers Undo.
     - Fields follow the `TextField` error contract, and a failed save focuses the first invalid field.
     - New listings start with no document row.
     - Optional fields are marked.
     - Sample listings never show Verified.
     - A coordinator who can't edit a listing gets a notice instead of an empty Status card.
   - **Listings table:**
     - Coordinators can only select their own drafts.
     - Failed rows give a reason specific to the action.
     - Every phone card links to the listing.
     - Batch Publish and Unpublish confirm first; batch archive offers Undo.
     - New "Closing within 7 days" filter.
   - **Questions:**
     - A Reply button opens the reply box.
     - A "Waiting N school days" pill (`schoolDaysSince`, unit-tested).
     - Close question offers Undo.
   - **Announcements:** errors are announced and focused, and the form comes first on phones.
   - **Audit log:**
     - Plain-language action labels (`actionLabel`, unit-tested) and the affected listing or account in each row.
     - Neutral before/after colours and an expand chevron.
     - Raw codes stay in the details and the CSV.
   - **Overview:**
     - Work queue: the 3 questions waiting longest, and listings closing within 7 days.
     - Role-aware summary sentence.
     - Tiles link to the right filters.
   - Tests: 58 of 58 E2E pass on a reset DB. Unit tests 50 of 50, pgTAP 247 of 247, and axe is clean on every staff and admin route in both themes. The detector shows only the two known `#334155` provider-colour defaults.
   - Skipped (P2/P3), listed for later:
     - Collapsible filters on phones.
     - Sorting from column headers.
     - An announcement preview, and a locked "Posted as".
     - A "More" menu for the admin batch bar.
     - Audit log in the admin tab bar (it's linked from /admin/users and the account menu instead).
     - Staff footer links.
     - A browser Back guard in the editor.
   - Screenshots: `docs/screenshots/phase8-g4-before/` and `docs/screenshots/phase8-g4-after/`.
7. **Phase 8 is done.**

## Open issues

- **GitHub Actions CI failure (fixed 2026-11-05):** the audit CSV/paging E2E test assumed more than one page of audit rows, which a fresh CI database doesn't have. The test now seeds 26 rows. CI is split into static, database and e2e jobs, on the Node 24 v7 actions.
- **One-off pgTAP failure from Phase 6:** fixed in Phase 9 (seed dates vs. test day).
- **`npm audit`:** clean, via overrides. Remove the `postcss` override when moving to Next 16.
- **E2E on this machine:** clear `.next/cache/fetch-cache` before full runs. Tests can time out under memory pressure from other apps, so rerun before treating a failure as real.
- **Detector agents:** deleting a test auth user leaves its profile tombstone, which is by design. Critique agents now also delete those profile rows.
