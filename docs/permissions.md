# Roles and permissions

Iskolar has exactly three roles, stored in `public.profiles.role` (`student`, `coordinator`, `admin`). Everyone who signs up is a student. Admins are never self-registered: the first one is created with `npm run seed:admin` (Phase 3), and admins promote others.

## Matrix

| Capability | Student | Coordinator | Admin |
|---|---|---|---|
| Browse and search published scholarships | ✅ | ✅ | ✅ (visitors too) |
| Eligibility check | ✅ own answers only | — | — |
| Own profile, eligibility answers, tracker, document checklist, reminder settings | ✅ own only | own profile only | own profile only |
| Ask questions (inquiries) | ✅ | — | — |
| See draft, in-review and archived listings | — | ✅ | ✅ |
| Create a listing (always a draft, auto-assigned to the creator) | — | ✅ | ✅ |
| Edit a listing, including deadlines, criteria, documents, steps, benefits and notes | — | ✅ listings assigned to them | ✅ all |
| Submit a draft for verification | — | ✅ | ✅ |
| Verify, re-check, publish, unpublish, archive, delete listings | — | — | ✅ |
| Assign a coordinator to a listing | — | — | ✅ |
| Reply to inquiries, close or reopen them | — | ✅ | ✅ |
| Post announcements; edit or delete their own | — | ✅ | ✅ (anyone's) |
| Read approved FAQs and search them (`search_faqs`) | ✅ | ✅ | ✅ (visitors too) |
| Read the Announcements board (`/announcements`) | ✅ | ✅ | ✅ (signed in only since 2026-11-11; visitors are sent to sign in) |
| See "Where to submit" on a published listing | ✅ | ✅ | ✅ (visitors too) |
| Create and edit FAQ drafts (and "Save as FAQ" from an answered question) | — | ✅ | ✅ |
| Approve, archive or edit approved FAQs | — | — | ✅ |
| See deadline change history | — | ✅ | ✅ |
| Manage users: list, change role, deactivate, reactivate, delete | — | — | ✅ |
| View the audit log | — | — | ✅ |
| Read students' answers, applications or notifications | — | — | — (privacy: nobody but the student) |

Guards that apply even to admins:

- An admin can't deactivate, delete or demote themselves.
- The last active admin can't be removed. Because self-removal is blocked and only an active admin can act, there is always one left.
- Deleted accounts can't be reactivated or have their role changed.
- Nobody can update or delete audit entries, including admins and the database owner.

## How it's enforced (four layers)

1. **Middleware** (Phase 3) refreshes the session, verifies the user with Supabase Auth and routes by the `app_role` JWT claim. Wrong role gets a 403 page; signed out goes to `/login?next=…`.
2. **`requireRole()`** (Phase 3) runs at the start of every server action and route handler. It re-checks the user with Auth, reads role and status from `profiles` (never from the JWT alone), and validates input with zod.
3. **Row Level Security** on every table (`supabase/migrations/…_rls.sql`), with column privileges on top:
   - Users can update only `full_name` on their own profile, and only `read_at` on their own notifications.
   - Role and status changes go through admin functions (`admin_set_role`, `batch_users_status`, `admin_soft_delete_user`) that check `is_admin()`. A trigger also rejects direct changes.
   - Coordinator limits (no publishing, verifying or reassigning) are enforced by the `guard_scholarship_workflow` trigger, so they hold whatever the client sends.
4. **Deactivated accounts** are locked out three ways: the Auth ban (Phase 5, server), the custom access token hook refusing new tokens, and RLS helpers returning nothing for non-active accounts, which covers a JWT that is still valid.

### Why RLS reads the role from the table, not the JWT

The brief suggests reading the role from the JWT in RLS to avoid a query. Iskolar puts the role in the JWT (`app_role`, via the custom access token hook) and middleware uses it. RLS doesn't, because an access token stays valid for up to an hour after an admin demotes or deactivates someone. RLS instead calls `my_role()`, a primary-key lookup on `profiles` that also checks `status = 'active'`. Policies wrap it as `(select public.my_role())`, so Postgres runs it once per statement, not per row.

## Tests

`npm run test:db` runs the pgTAP suites in `supabase/tests/`:

| File | Proves |
|---|---|
| `00_schema.test.sql` | RLS is on for every table; audit log is append-only; internal functions are locked |
| `10_student_isolation.test.sql` | A student can't read or change another student's data, escalate their role, or call staff or admin operations; deactivated and signed-out access |
| `20_staff_permissions.test.sql` | Coordinators are limited to assigned listings and can't publish, verify, reassign, delete, touch users or read the audit log; admins can; every staff mutation is audited, one row per item |
| `30_admin_users.test.sql` | Self and last-admin guards, batch deactivate/reactivate, soft delete, audit entries, the auth hook |
| `40_eligibility_search.test.sql` | Explainable eligibility (met / not met / unknown) and server-side search, filters, sorting and paging |
| `98_where_to_submit.test.sql` | Where-to-submit fields: optional, online needs an https link, `save_scholarship` saves and clears them, audit entries, the sample values, visitors can read them |
| `97_faqs.test.sql` | FAQ search scoring ([faq-search.md](faq-search.md)), approved-only results, RLS for visitors, students, coordinators and admins, admin-only approval, audit entries, the search rate limit |
