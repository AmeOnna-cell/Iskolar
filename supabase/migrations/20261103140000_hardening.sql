-- Hardening (security + performance advisors).

-- ---------- 1. Function privileges ----------

-- SECURITY DEFINER trigger functions: only ever run by their triggers (which don't need EXECUTE),
-- never called directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
revoke execute on function public.audit_row() from public, anon, authenticated;
revoke execute on function public.audit_inquiry_status() from public, anon, authenticated;
revoke execute on function public.inquiry_replies_bookkeeping() from public, anon, authenticated;
revoke execute on function public.profiles_default_preferences() from public, anon, authenticated;
revoke execute on function public.providers_refresh_search_doc() from public, anon, authenticated;
revoke execute on function public.record_deadline_change() from public, anon, authenticated;
revoke execute on function public.application_documents_same_scholarship() from public, anon, authenticated;

-- Role helpers: visitors only keep what an anon code path needs.
--   is_staff()           the "published for everyone" policy on scholarships calls it for anon
--   my_student_profile() search_scholarships (open to visitors) calls it; returns no rows for anon
-- Signed-in users keep the rest: RLS policies and invoker triggers call them.
revoke execute on function public.my_role() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_student() from public, anon;
revoke execute on function public.is_active_user() from public, anon;
revoke execute on function public.is_privileged() from public, anon;
revoke execute on function public.can_edit_scholarship(uuid) from public, anon;
revoke execute on function public.assert_admin() from public, anon;
revoke execute on function public.other_active_admin_exists(uuid) from public, anon;
grant execute on function public.my_role(), public.is_admin(), public.is_student(), public.is_active_user(),
  public.is_privileged(), public.can_edit_scholarship(uuid), public.assert_admin(),
  public.other_active_admin_exists(uuid)
  to authenticated, service_role;

-- ---------- 2. pg_net out of public (nothing uses it yet; the reminder job arrives in Phase 6) ----------

drop extension if exists pg_net;
create extension if not exists pg_net with schema extensions;

-- ---------- 3. Covering indexes for foreign keys (performance advisor: unindexed_foreign_keys) ----------
-- Each serves the FK check when the referenced row is deleted or updated, plus the joins noted.

create index announcements_author_idx on public.announcements (author_id) where author_id is not null;
create index announcements_scholarship_idx on public.announcements (scholarship_id) where scholarship_id is not null;
create index deadline_changes_changed_by_idx on public.deadline_changes (changed_by) where changed_by is not null;
create index inquiries_scholarship_idx on public.inquiries (scholarship_id) where scholarship_id is not null;
create index inquiry_replies_author_idx on public.inquiry_replies (author_id) where author_id is not null;
create index profiles_deactivated_by_idx on public.profiles (deactivated_by) where deactivated_by is not null;
create index scholarships_created_by_idx on public.scholarships (created_by) where created_by is not null;
create index scholarships_last_verified_by_idx on public.scholarships (last_verified_by) where last_verified_by is not null;
