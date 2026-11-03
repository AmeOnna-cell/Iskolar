-- 3. The student's tracker: one application per student per scholarship, plus checked documents.

create type public.application_stage as enum ('saved', 'preparing', 'submitted');
create type public.application_result as enum ('pending', 'approved', 'rejected');

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  scholarship_id uuid not null references public.scholarships (id) on delete cascade,
  stage public.application_stage not null default 'saved',
  result public.application_result not null default 'pending',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Saving the same scholarship twice would be a bug.
  constraint one_application_per_scholarship unique (student_id, scholarship_id),
  -- A result only makes sense once submitted.
  constraint result_needs_submission check (result = 'pending' or stage = 'submitted')
);

create function public.applications_bookkeeping() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.student_id := coalesce(new.student_id, auth.uid());
  elsif new.student_id is distinct from old.student_id or new.scholarship_id is distinct from old.scholarship_id then
    raise exception 'An application cannot move to another student or scholarship' using errcode = '42501';
  end if;
  if new.stage = 'submitted' and (tg_op = 'INSERT' or old.stage <> 'submitted') then
    new.submitted_at := now();
  elsif new.stage <> 'submitted' then
    new.submitted_at := null;
    new.result := 'pending';
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger applications_bookkeeping before insert or update on public.applications
  for each row execute function public.applications_bookkeeping();

create table public.application_documents (
  application_id uuid not null references public.applications (id) on delete cascade,
  document_id uuid not null references public.scholarship_documents (id) on delete cascade,
  checked_at timestamptz not null default now(),
  primary key (application_id, document_id)
);

-- A checked document must belong to the application's own scholarship.
create function public.application_documents_same_scholarship() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1
      from public.applications a
      join public.scholarship_documents d on d.scholarship_id = a.scholarship_id
     where a.id = new.application_id and d.id = new.document_id
  ) then
    raise exception 'That document belongs to a different scholarship' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger application_documents_check before insert or update on public.application_documents
  for each row execute function public.application_documents_same_scholarship();
