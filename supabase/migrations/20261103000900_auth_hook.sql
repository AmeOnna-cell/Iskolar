-- 9. Custom Access Token Hook: puts the role in the JWT (claim `app_role`) for middleware routing,
--    and refuses to issue tokens to deactivated or deleted accounts (a second lock beside the Auth ban).
--    Enabled in supabase/config.toml locally; in the cloud: Dashboard → Authentication → Hooks.
--    Scheduling (pg_cron + pg_net) and notification triggers arrive with Phase 6.

create function public.custom_access_token_hook(event jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  r public.app_role;
  s public.account_status;
begin
  select p.role, p.status into r, s from public.profiles p where p.id = (event ->> 'user_id')::uuid;

  if s in ('deactivated', 'deleted') then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'This account has been deactivated. Contact the scholarship office if you think this is a mistake.'
    ));
  end if;

  return jsonb_set(
    event, '{claims}',
    coalesce(event -> 'claims', '{}'::jsonb) || jsonb_build_object('app_role', coalesce(r, 'student'))
  );
end $$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant select on table public.profiles to supabase_auth_admin;
