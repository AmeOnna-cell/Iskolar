-- Self-service account deletion (team-leader revisions, group C).
--
-- * anonymize_account(): the personal-data removal both delete paths share. Internal: no API role
--   can execute it; only the two security-definer functions below call it.
-- * admin_soft_delete_user(): unchanged guards (assert_admin, not yourself, never the last admin),
--   now calling anonymize_account().
-- * delete_my_account(): the signed-in user deletes themselves, and only themselves (auth.uid(), no
--   target parameter). It re-checks the typed email and the current password here in the database,
--   so calling the RPC directly can't skip either check, and limits password attempts to 5 an hour.
--   It blocks the last active admin, writes an audit entry and ends every session. The server then
--   deletes the Supabase Auth user (service role), as the admin path does.

create function public.anonymize_account(p_user uuid, p_actor uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.student_profiles where user_id = p_user;
  delete from public.applications where student_id = p_user;
  delete from public.notifications where user_id = p_user;
  delete from public.notification_preferences where user_id = p_user;
  delete from public.push_subscriptions where user_id = p_user;
  update public.inquiries set student_context = 'Deleted account' where student_id = p_user;
  update public.profiles
     set status = 'deleted', full_name = null, email = null,
         deactivated_at = coalesce(deactivated_at, now()), deactivated_by = p_actor
   where id = p_user;
end $$;
revoke execute on function public.anonymize_account(uuid, uuid) from public, anon, authenticated, service_role;

-- Same signature, same guards, same order as 20261103000700_rpc.sql; only the body's data steps moved.
create or replace function public.admin_soft_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare target public.profiles;
begin
  perform public.assert_admin();
  select * into target from public.profiles where id = p_user for update;
  if not found then
    raise exception 'Account not found' using errcode = 'P0002';
  elsif target.status = 'deleted' then
    raise exception 'Already deleted' using errcode = '22023';
  elsif p_user = auth.uid() then
    raise exception 'You can''t delete your own account' using errcode = '42501';
  elsif target.role = 'admin' and not public.other_active_admin_exists(p_user) then
    raise exception 'This is the last active admin' using errcode = '42501';
  end if;

  perform public.anonymize_account(p_user, auth.uid());
end $$;

-- Returns 'deleted', 'wrong_password' or 'too_many_attempts'. A wrong password returns instead of
-- raising so the attempt counter is kept (a raise would roll it back).
create function public.delete_my_account(p_email text, p_password text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  me public.profiles;
  hash text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  select * into me from public.profiles where id = auth.uid() for update;
  if not found or me.status <> 'active' then
    raise exception 'This account can''t be deleted' using errcode = '42501';
  elsif lower(coalesce(me.email, '')) <> lower(trim(coalesce(p_email, ''))) then
    raise exception 'The email you typed doesn''t match your account' using errcode = '22023';
  elsif me.role = 'admin' and not public.other_active_admin_exists(me.id) then
    raise exception 'You''re the last active admin. Make someone else an admin first.' using errcode = '42501';
  end if;

  if not public.check_rate_limit('self_delete:user:' || me.id, 5, 3600) then
    return 'too_many_attempts';
  end if;
  select u.encrypted_password into hash from auth.users u where u.id = me.id;
  if coalesce(hash, '') = '' or extensions.crypt(coalesce(p_password, ''), hash) <> hash then
    return 'wrong_password';
  end if;

  perform public.write_audit(me.id, 'user.self_delete', 'user', me.id::text,
    jsonb_build_object('status', me.status), jsonb_build_object('status', 'deleted'));
  perform public.anonymize_account(me.id, me.id);
  delete from auth.sessions where user_id = me.id;
  return 'deleted';
end $$;
revoke execute on function public.delete_my_account(text, text) from public, anon;
grant execute on function public.delete_my_account(text, text) to authenticated;
