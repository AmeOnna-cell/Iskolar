-- 6. Row Level Security on every table, plus column privileges.
--
-- Helpers are wrapped in (select ...) so Postgres evaluates them once per statement (initplan),
-- not once per row. my_role() returns NULL for deactivated or deleted accounts, so a
-- deactivated user holding a still-valid JWT is denied everywhere.

create function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.my_role() is not null
$$;

-- Coordinators edit listings assigned to them; admins edit all.
create function public.can_edit_scholarship(p_scholarship uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
      or (public.is_staff() and exists (
            select 1 from public.scholarships s
             where s.id = p_scholarship and s.assigned_coordinator_id = auth.uid()))
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'student_profiles', 'providers', 'scholarships', 'scholarship_criteria', 'scholarship_benefits',
    'scholarship_documents', 'scholarship_steps', 'scholarship_notes', 'deadline_changes', 'applications',
    'application_documents', 'announcements', 'inquiries', 'inquiry_replies', 'notifications',
    'notification_preferences', 'push_subscriptions', 'audit_logs', 'rate_limits'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- Column privileges (defence in depth beside the policies) ----------

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

revoke insert, update, delete on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

revoke insert, update, delete on public.deadline_changes from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;
revoke all on public.rate_limits from anon, authenticated;
revoke insert, delete on public.notification_preferences from anon, authenticated;

-- Students and anonymous visitors never write staff tables, whatever the policies say.
revoke insert, update, delete on public.providers, public.scholarships, public.scholarship_criteria,
  public.scholarship_benefits, public.scholarship_documents, public.scholarship_steps,
  public.scholarship_notes, public.announcements, public.inquiry_replies from anon;
revoke all on public.student_profiles, public.applications, public.application_documents,
  public.inquiries, public.notifications, public.notification_preferences, public.push_subscriptions from anon;

revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
revoke execute on function public.log_audit(text, text, text, jsonb, jsonb, uuid) from public, anon;

-- ---------- profiles ----------

create policy "profiles: read own; admins read all; staff read staff"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_admin())
    or ((select public.is_staff()) and role <> 'student')
  );

create policy "profiles: update own name"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and (select public.is_active_user()))
  with check (id = (select auth.uid()));

-- Read by the custom access token hook.
create policy "profiles: auth hook reads roles"
  on public.profiles for select to supabase_auth_admin
  using (true);

-- ---------- student_profiles (eligibility answers): the student only ----------

create policy "student_profiles: own"
  on public.student_profiles for all to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()))
  with check (user_id = (select auth.uid()) and (select public.is_student()));

-- ---------- providers ----------

create policy "providers: anyone reads"
  on public.providers for select to anon, authenticated using (true);
create policy "providers: staff add"
  on public.providers for insert to authenticated with check ((select public.is_staff()));
create policy "providers: staff edit"
  on public.providers for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "providers: admins delete"
  on public.providers for delete to authenticated using ((select public.is_admin()));

-- ---------- scholarships ----------

create policy "scholarships: published for everyone, all for staff"
  on public.scholarships for select to anon, authenticated
  using (listing_status = 'published' or (select public.is_staff()));

-- What a coordinator may set is enforced by guard_scholarship_workflow (migration 2).
create policy "scholarships: staff create"
  on public.scholarships for insert to authenticated
  with check ((select public.is_staff()));

create policy "scholarships: admins, or the assigned coordinator, edit"
  on public.scholarships for update to authenticated
  using ((select public.is_admin()) or ((select public.is_staff()) and assigned_coordinator_id = (select auth.uid())))
  with check ((select public.is_admin()) or ((select public.is_staff()) and assigned_coordinator_id = (select auth.uid())));

create policy "scholarships: admins delete"
  on public.scholarships for delete to authenticated using ((select public.is_admin()));

-- ---------- scholarship parts: visible with their listing, editable by its editors ----------

do $$
declare t text;
begin
  foreach t in array array['scholarship_criteria', 'scholarship_benefits', 'scholarship_documents', 'scholarship_steps', 'scholarship_notes'] loop
    execute format($f$
      create policy "%1$s: visible with the listing" on public.%1$I for select to anon, authenticated
        using (exists (select 1 from public.scholarships s where s.id = scholarship_id));
      create policy "%1$s: editors insert" on public.%1$I for insert to authenticated
        with check (public.can_edit_scholarship(scholarship_id));
      create policy "%1$s: editors update" on public.%1$I for update to authenticated
        using (public.can_edit_scholarship(scholarship_id)) with check (public.can_edit_scholarship(scholarship_id));
      create policy "%1$s: editors delete" on public.%1$I for delete to authenticated
        using (public.can_edit_scholarship(scholarship_id));
    $f$, t);
  end loop;
end $$;

create policy "deadline_changes: staff read"
  on public.deadline_changes for select to authenticated using ((select public.is_staff()));

-- ---------- applications: the student only ----------

create policy "applications: own read"
  on public.applications for select to authenticated
  using (student_id = (select auth.uid()) and (select public.is_active_user()));

create policy "applications: own create for published listings"
  on public.applications for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and (select public.is_student())
    and exists (select 1 from public.scholarships s where s.id = scholarship_id and s.listing_status = 'published')
  );

create policy "applications: own update"
  on public.applications for update to authenticated
  using (student_id = (select auth.uid()) and (select public.is_student()))
  with check (student_id = (select auth.uid()));

create policy "applications: own delete"
  on public.applications for delete to authenticated
  using (student_id = (select auth.uid()) and (select public.is_student()));

create policy "application_documents: own"
  on public.application_documents for all to authenticated
  using (
    (select public.is_active_user())
    and exists (select 1 from public.applications a where a.id = application_id and a.student_id = (select auth.uid()))
  )
  with check (
    (select public.is_student())
    and exists (select 1 from public.applications a where a.id = application_id and a.student_id = (select auth.uid()))
  );

-- ---------- announcements ----------

create policy "announcements: anyone reads"
  on public.announcements for select to anon, authenticated using (true);
create policy "announcements: staff post"
  on public.announcements for insert to authenticated with check ((select public.is_staff()));
create policy "announcements: author or admin edits"
  on public.announcements for update to authenticated
  using ((select public.is_admin()) or ((select public.is_staff()) and author_id = (select auth.uid())))
  with check ((select public.is_admin()) or ((select public.is_staff()) and author_id = (select auth.uid())));
create policy "announcements: author or admin deletes"
  on public.announcements for delete to authenticated
  using ((select public.is_admin()) or ((select public.is_staff()) and author_id = (select auth.uid())));

-- ---------- inquiries ----------

create policy "inquiries: asker and staff read"
  on public.inquiries for select to authenticated
  using ((student_id = (select auth.uid()) and (select public.is_active_user())) or (select public.is_staff()));
create policy "inquiries: students ask"
  on public.inquiries for insert to authenticated
  with check ((select public.is_student()) and student_id = (select auth.uid()));
create policy "inquiries: staff update status"
  on public.inquiries for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "inquiries: admins delete"
  on public.inquiries for delete to authenticated using ((select public.is_admin()));

create policy "inquiry_replies: staff and the asker read"
  on public.inquiry_replies for select to authenticated
  using (
    (select public.is_staff())
    or ((select public.is_active_user())
        and exists (select 1 from public.inquiries i where i.id = inquiry_id and i.student_id = (select auth.uid())))
  );
create policy "inquiry_replies: staff reply"
  on public.inquiry_replies for insert to authenticated with check ((select public.is_staff()));
create policy "inquiry_replies: author or admin edits"
  on public.inquiry_replies for update to authenticated
  using ((select public.is_admin()) or ((select public.is_staff()) and author_id = (select auth.uid())))
  with check ((select public.is_admin()) or ((select public.is_staff()) and author_id = (select auth.uid())));
create policy "inquiry_replies: author or admin deletes"
  on public.inquiry_replies for delete to authenticated
  using ((select public.is_admin()) or ((select public.is_staff()) and author_id = (select auth.uid())));

-- ---------- notifications & preferences & push: own only ----------

create policy "notifications: own read"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()));
create policy "notifications: own mark read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()))
  with check (user_id = (select auth.uid()));

create policy "notification_preferences: own read"
  on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()));
create policy "notification_preferences: own update"
  on public.notification_preferences for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()))
  with check (user_id = (select auth.uid()));

create policy "push_subscriptions: own read"
  on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_active_user()));
create policy "push_subscriptions: own add"
  on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_active_user()));
create policy "push_subscriptions: own remove"
  on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------- audit log: admins read; nobody writes directly ----------

create policy "audit_logs: admins read"
  on public.audit_logs for select to authenticated using ((select public.is_admin()));

-- rate_limits: RLS on with no policies; only check_rate_limit() (security definer) touches it.
