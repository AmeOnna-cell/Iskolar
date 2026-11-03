# Data retention and account deletion

## Deleting an account (admin → Users → Delete)

The admin must type the account's exact email to confirm. Then, in order:

1. **Remove personal data** (`public.admin_soft_delete_user`, one transaction):
   - deleted: eligibility answers (`student_profiles`), applications and checklists, notifications, notification preferences, push subscriptions;
   - kept but anonymised: the `profiles` row becomes a tombstone (`status = deleted`, name and email cleared), and questions the student asked keep their text with the context replaced by "Deleted account".
2. **End every session** (`public.revoke_user_sessions`, service role).
3. **Delete the sign-in account** (Supabase Auth Admin API, `auth.users`).

Each step is written to the audit log: `user.delete` from the database trigger and `user.auth_deleted` in the admin's name.

### Why a tombstone instead of deleting the profile row

Other records point at profiles: listings a coordinator created or verified, replies staff wrote, announcements, deadline changes and every audit entry. A tombstone keeps those references valid, so history still reads "verified by a deleted account" instead of breaking, while no personal data remains. `profiles.id` deliberately has no foreign key to `auth.users`, so deleting the Auth user can't cascade into the tombstone.

### What can't be undone

A deleted account can't be reactivated or restored. The person can sign up again with the same email as a new account.

## Deactivating an account

Deactivation is reversible: nothing is deleted. The account is banned in Supabase Auth, every session is revoked, the access-token hook refuses new tokens, and RLS denies a still-valid token. Reactivation lifts the ban; the person signs in again.

## The audit log

Audit entries are kept indefinitely and can't be updated or deleted by anyone, including admins and the database owner (a trigger rejects UPDATE, DELETE and TRUNCATE). Entries about users record only the role and status fields that changed, never names or emails.

If a retention period is ever required (for example, keep 3 years), the purge has to be a deliberate, reviewed migration that temporarily drops the immutability trigger. No code path in the app can do it.

## Other data

- **Rate-limit counters** (`rate_limits`) hold keys such as `login:ip:<ip address>` or `reset:email:<email>` with a hit count. A key's old windows are deleted the next time it's used. Keys that never recur stay, so add a scheduled cleanup (Phase 6 cron) if the table grows.
- **Notifications** stay until the account is deleted (Phase 6 may add a 12-month cleanup).
