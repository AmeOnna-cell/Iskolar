# Iskolar: final report

Status on 2026-11-08: all nine build phases are done. Live at <https://iskolar-ochre.vercel.app> (Supabase project `gfiutwubhsnpgkaflpuh`, Singapore).

**Checks at the end of Phase 9**, on a freshly reset local database and a production build:
- `npm run lint` and `npm run typecheck` are clean.
- Unit tests: 50 of 50.
- Database tests (pgTAP): 247 of 247. They also pass on a database aged 7 and 30 days.
- End to end (Playwright): 69 of 69, including axe on every screen in light and dark.
- `npm audit`: 0 vulnerabilities.

## What was built

**Students**
- **Find scholarships:** search, filters and sort, all done in the database; the first page is server-rendered.
- **Listing pages:** official source, last-checked date and verification status on every listing; sample listings are labelled.
- **Explainable eligibility check:** met, not met or unknown for each requirement, with the reason, and "You qualify", "Might qualify" or "Not eligible right now" overall. The "preliminary check" disclaimer is always shown.
- **One-column dashboard:** led by what's urgent.
- **Application tracker:** document checklists with where to get each document.
- **Alerts:** a live badge, plus reminders by email and web push at a lead time the student chooses.
- **Help:** FAQ, plus questions to the scholarship office.

**Coordinators and admins**
- **Work queue:** the questions waiting longest and the listings closing this week.
- **Listings:** a table with batch actions, a full editor (requirements, documents, steps, benefits) and the verify-and-publish workflow, with deadline history.
- **Questions and announcements.**
- **Users** (admin): role changes, deactivate and reactivate, and delete with type-to-confirm.
- **Audit log:** every change, in plain language, with a before/after view and CSV export.

**Section 4 of the brief**, with the test that proves each item:

| Requirement | Test |
|---|---|
| 4.1 Sign-up with email confirmation (Gmail SMTP, branded templates, resend with cooldown, expired-link states) | `e2e/4.1-signup-verification.spec.ts` |
| 4.2 Password reset (no account enumeration; other sessions end) | `e2e/4.2-reset-password.spec.ts` |
| 4.3 Three roles, 403 page, safe `?next=` | `e2e/4.3-roles.spec.ts`; pgTAP 10–30 |
| 4.4 Validation in four layers (middleware, `requireRole` + zod on every action, RLS, deactivated JWTs rejected), rate limits | `e2e/4.4-validation.spec.ts`, 4.3; pgTAP 10–50 |
| 4.5 Deactivate, delete and roles, all audited; audit log with filters, paging, diff and CSV | `e2e/4.5-admin-users.spec.ts`; pgTAP 30 |
| 4.6 Server-side paging, URL state, batch actions in one transaction with per-row results | `e2e/4.6-tables-batch.spec.ts` |
| 4.7 On-site, email and push notifications; daily reminders that never repeat; change, new-match and announcement alerts | `e2e/4.7-notifications.spec.ts`; pgTAP 80 |
| 4.8 No way back after sign-out; `no-store` on private pages; signed-in users skip `/login` | `e2e/4.8-back-after-signout.spec.ts` |
| 4.9 Indexes, `EXPLAIN ANALYZE` on 5,000 listings and 50,000 alerts, tagged public cache | `e2e/4.9-caching.spec.ts`; pgTAP 90; `docs/performance.md`, `docs/caching.md` |
| 4.10 Search, filters and sort in the database | `e2e/4.10-search-filter.spec.ts`; pgTAP 40 |
| 4.11 Spacing scale and 44px touch targets | `e2e/4.11-spacing.spec.ts`; `DESIGN.md` |
| 4.12 One-column dashboard in priority order | `e2e/4.12-dashboard.spec.ts` |
| 4.13 Mobile: no sideways scroll at 360/768/1280/1440, tab bar, tables as cards, dialogs as sheets | `e2e/4.13-mobile.spec.ts`; screenshots in `docs/screenshots/` |

**Phase 9 also fixed:**
- **Back button in the listing editor:** it now asks before leaving unsaved edits.
- **Saved theme never applied before load:** the inline `<head>` script had been a syntax error since Phase 1. Its string was imported from a client module, so the server saw a client reference instead.
- **New-password page:** no sign-up pitch for people already signed in, and the email gets its own line.
- **Listings table at 768px:** it scrolled sideways.
- **36px controls on phones:** the "Rows" select and the sort links were below the touch-target size.
- **`npm audit`:** see below.
- **The one-off pgTAP failure from Phase 6:** the seed's dates are relative to the day of the reset. Three days later an open sample listing closes, and three assertions change. Both affected test files now re-anchor the dates to today inside their transaction.

## Deferred, and why

**Waiting on you**
- **Privacy note on sign-up:** the slot is in place (`PRIVACY_NOTE` in `src/app/(auth)/forms.tsx`) and renders nothing until you give the wording.

**Can't be tested automatically**
- **Web push:** headless Chromium has no push service, so neither subscribing nor delivery is covered end to end. The sending logic, including clean-up of expired subscriptions, is unit-tested.
- **Sign-in rate limits:** the limit is per IP address, and the whole E2E suite signs in from one address, so a test would trip it for later tests. The same rate-limit helper is exercised through the question limit (4.4).

**Small, chosen against for now**
- **Admin batch bar:** a "More" menu to shorten it.
- **Phone filters:** collapsible filter bars.
- **Tables:** sorting from the column headers (the sort links work).
- **Announcements:** a preview, and a locked "Posted as" (there's no organisation field to fill it from yet).
- **Navigation:** the audit log in the admin tab bar (it's linked from Users and the account menu); student-facing footer links on staff pages.

**Known ceilings**, marked with `ponytail:` comments in the code:
- **Editor's Back/Forward guard:** it assumes Back. A cancelled Forward steps forward again.
- **"Waiting N school days":** it counts weekdays and ignores Philippine holidays.
- **Overview's closing list:** it reads up to 50 listings.

**Next.js 16**
- Every Next 15 release pins a vulnerable `postcss`. An npm `overrides` entry lifts it to the fixed 8.5 line, and audit is clean.
- The first Next release that fixes it on its own is 16.4.5, a major upgrade with breaking changes, so it wasn't done here. When upgrading, remove the `postcss` override.
- typescript-eslint's `minimatch` is also overridden, to 11.x. `npm audit fix` would have downgraded typescript-eslint to a version that breaks ESLint 9.

## What you still need to do by hand

1. **Privacy note:** send the wording, with a link if there should be one.
2. **Real listings:**
   - Coordinators and admins enter real scholarships and verify each one against its official source.
   - Then archive or delete the nine sample listings.
   - Sample listings never show as verified, but they are still public.
3. **Staff accounts:**
   - Create the real admin with `npm run seed:admin`.
   - Promote coordinators from `/admin/users`.
   - Remove the test accounts if any were made in the cloud project.
4. **Email volume:** Gmail allows about 500 emails a day. If sign-ups and reminders will exceed that, move to Google Workspace (2,000 a day) or another SMTP provider, and set `EMAIL_DAILY_LIMIT`. See `docs/setup-smtp.md`.
5. **A new environment** (another Supabase project or Vercel deployment): follow the checklist in `docs/SETUP.md`. Everything in it is already done for the current cloud project.
