-- FAQs with rule-based suggestions (no AI): Postgres full-text search plus pg_trgm for typos.
-- Scoring rules are explained in docs/faq-search.md.
--
-- * Everyone (signed-out visitors too) reads approved FAQs. Coordinators create and edit drafts;
--   only admins approve or archive (or edit approved FAQs). Every change is audit-logged.
-- * `slug` is the /help#faq-<slug> anchor. It is set once from the question and never changes,
--   so links keep working after edits.

create type public.faq_status as enum ('draft', 'approved', 'archived');

-- Question and keywords weighted A, answer weighted B. Each part is indexed twice: 'english'
-- (stems word forms: "reminders" ~ "remind") and 'simple' (no stemming or English stopwords, so
-- Filipino and Taglish words like "paalala" or "brgy" match as typed).
-- Immutable wrapper: array_to_string is only stable, which a generated column doesn't accept.
create function public.faq_search_doc(p_question text, p_keywords text[], p_answer text) returns tsvector
language sql immutable set search_path = '' as $$
  select setweight(to_tsvector('english', p_question || ' ' || array_to_string(p_keywords, ' ')), 'A')
      || setweight(to_tsvector('simple', p_question || ' ' || array_to_string(p_keywords, ' ')), 'A')
      || setweight(to_tsvector('english', p_answer), 'B')
      || setweight(to_tsvector('simple', p_answer), 'B')
$$;

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  -- Filled from the question by faqs_bookkeeping when left empty.
  slug text not null default '' unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  question text not null check (char_length(question) between 5 and 200),
  -- Plain text; links as [text](/path) or [text](https://…), rendered by the app.
  answer text not null check (char_length(answer) between 1 and 4000),
  keywords text[] not null default '{}' check (cardinality(keywords) <= 30),
  scholarship_id uuid references public.scholarships (id) on delete set null,
  status public.faq_status not null default 'draft',
  created_by uuid references public.profiles (id) on delete set null,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (public.faq_search_doc(question, keywords, answer)) stored
);

create index faqs_search_idx on public.faqs using gin (search);
create index faqs_question_trgm_idx on public.faqs using gin (question extensions.gin_trgm_ops);
create index faqs_status_idx on public.faqs (status, created_at);
create index faqs_scholarship_idx on public.faqs (scholarship_id) where scholarship_id is not null;
create index faqs_created_by_idx on public.faqs (created_by) where created_by is not null;
create index faqs_approved_by_idx on public.faqs (approved_by) where approved_by is not null;

create trigger faqs_updated_at before update on public.faqs
  for each row execute function public.set_updated_at();

-- Who and when come from the database, never from the request. Approving stamps approved_by/at.
create function public.faqs_bookkeeping() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.approved_by := null;
    new.approved_at := null;
    if coalesce(new.slug, '') = '' then
      new.slug := coalesce(nullif(trim(both '-' from left(regexp_replace(lower(new.question), '[^a-z0-9]+', '-', 'g'), 60)), ''), 'faq');
      if exists (select 1 from public.faqs f where f.slug = new.slug) then
        new.slug := new.slug || '-' || left(replace(new.id::text, '-', ''), 6);
      end if;
    end if;
  else
    new.slug := old.slug;
    new.created_by := old.created_by;
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
  end if;
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status <> 'approved') then
    new.approved_by := auth.uid();
    new.approved_at := now();
  end if;
  return new;
end $$;
create trigger faqs_bookkeeping before insert or update on public.faqs
  for each row execute function public.faqs_bookkeeping();
revoke execute on function public.faqs_bookkeeping() from public, anon, authenticated;

-- ---------- Privileges and RLS ----------

alter table public.faqs enable row level security;
revoke all on public.faqs from anon, authenticated;
grant select on public.faqs to anon, authenticated;
grant insert (question, answer, keywords, scholarship_id, status),
      update (question, answer, keywords, scholarship_id, status)
  on public.faqs to authenticated;

create policy "faqs: approved for everyone, all for staff"
  on public.faqs for select to anon, authenticated
  using (status = 'approved' or (select public.is_staff()));

create policy "faqs: staff add drafts; admins may add approved"
  on public.faqs for insert to authenticated
  with check ((select public.is_admin()) or ((select public.is_staff()) and status = 'draft'));

-- Coordinators edit drafts and keep them drafts; admins approve, archive and edit any FAQ.
create policy "faqs: coordinators edit drafts, admins edit all"
  on public.faqs for update to authenticated
  using ((select public.is_admin()) or ((select public.is_staff()) and status = 'draft'))
  with check ((select public.is_admin()) or ((select public.is_staff()) and status = 'draft'));
-- No delete policy: archive instead.

-- ---------- The 7 FAQs that were hard-coded on /help (slugs keep the old #faq-… anchors) ----------

insert into public.faqs (slug, question, answer, keywords, status, created_at)
select v.slug, v.question, v.answer, v.keywords, 'approved', now() - (8 - v.n) * interval '1 second'
from (values
  (1, 'gwa', 'What is GWA and where do I find mine?',
   'GWA (general weighted average) is your grades averaged by units. It’s on your Certificate of Grades or student portal. Most schools use 1.00 as the highest grade.',
   array['grades', 'average', 'general weighted average', 'grado', 'marka', 'class card']),
  (2, 'indigency', 'Where do I get a Certificate of Indigency?',
   'At your barangay hall. Bring a valid ID and proof of residency. It’s usually free and released the same day, but lines get long near deadlines.',
   array['barangay', 'brgy', 'indigent', 'kahirapan', 'katunayan', 'mahirap', 'requirements']),
  (3, 'official', 'Is the eligibility check an official decision?',
   'No. It compares [your answers](/check) with the requirements on file and shows which ones you meet. The provider always makes the final decision, and some requirements, like exams or interviews, can only be checked by them.',
   array['qualified', 'qualify', 'eligible', 'result', 'pasado', 'opisyal', 'tanggap', 'approved']),
  (4, 'accurate', 'How do I know a listing is accurate?',
   'Each listing shows its official source and when it was last checked. Listings marked “Unverified” came from unofficial posts, so confirm them with the provider before preparing documents.',
   array['legit', 'scam', 'fake', 'verified', 'unverified', 'totoo', 'peke', 'source']),
  (5, 'sample', 'Why are some listings marked “Sample listing”?',
   'They are example data to show how Iskolar works. Confirm everything with the provider’s official page before you apply.',
   array['example', 'demo', 'halimbawa', 'test']),
  (6, 'two', 'Can I receive more than one scholarship?',
   'Sometimes. Many government programs don’t allow two government grants at once, while private and school awards often do. Check “Obligations” on each listing or ask the provider.',
   array['two', 'multiple', 'double', 'dalawa', 'sabay', 'another', 'both']),
  (7, 'reminders', 'How do reminders work?',
   'Save a scholarship or start preparing it, and we’ll remind you before it closes. Choose email, push or on-site alerts and how many days ahead in [My profile](/profile#reminders).',
   array['notification', 'notifications', 'alerts', 'deadline', 'email', 'paalala', 'abiso'])
) as v (n, slug, question, answer, keywords);

-- ---------- Audit (after the seed rows, so the migration itself isn't logged) ----------

create function public.audit_faq() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) - 'search' end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) - 'search' end;
  changed text[] := public.jsonb_changed_keys(o, n);
begin
  if coalesce(current_setting('iskolar.skip_audit', true), '') = 'on' then return null; end if;
  if tg_op = 'UPDATE' and cardinality(changed) = 0 then return null; end if;
  perform public.write_audit(
    auth.uid(),
    'faq.' || case
      when tg_op = 'INSERT' then 'create'
      when tg_op = 'DELETE' then 'delete'
      when 'status' = any (changed) then case new.status when 'approved' then 'approve' when 'archived' then 'archive' else 'return_to_draft' end
      else 'update' end,
    'faq', coalesce(n, o) ->> 'id',
    case when tg_op = 'UPDATE' then public.jsonb_pick(o, changed) else o end,
    case when tg_op = 'UPDATE' then public.jsonb_pick(n, changed) else n end
  );
  return null;
end $$;
create trigger faqs_audit after insert or update or delete on public.faqs
  for each row execute function public.audit_faq();
revoke execute on function public.audit_faq() from public, anon, authenticated;

-- ---------- search_faqs ----------

-- The query's meaningful words: lowercased letters/digits, at least 2 characters, without English
-- stopwords ("what", "the", "can") or common Filipino function words ("ang", "paano", "po").
-- At most 12 words from the first 200 characters.
create function public.faq_query_words(p text) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(distinct w), '{}')
  from (
    select w
    from unnest(regexp_split_to_array(lower(left(coalesce(p, ''), 200)), '[^[:alnum:]]+')) w
    where char_length(w) >= 2
      and to_tsvector('english', w) <> ''::tsvector
      and w <> all (array[
        'ako', 'ang', 'ano', 'at', 'ay', 'ba', 'dito', 'din', 'ito', 'iyan', 'ka', 'kami', 'kayo', 'ko', 'kung',
        'lang', 'mga', 'mo', 'na', 'naman', 'nang', 'ng', 'ni', 'pa', 'paano', 'po', 'pwede', 'puwede', 'rin',
        'sa', 'saan', 'si', 'sila', 'siya', 'tayo', 'yan', 'yung'])
    limit 12
  ) t
$$;

-- Approved FAQs only (security definer, so it filters status itself). Rate-limited to 60 calls a
-- minute per signed-in user, or per IP address for visitors. With p_scholarship (the ask form's
-- Topic), that scholarship's FAQs come first among the matches; it never lets a weak match through.
create function public.search_faqs(p_query text, p_limit integer default 3, p_scholarship uuid default null)
returns table (id uuid, slug text, question text, snippet text, answer text, score real)
language plpgsql volatile security definer set search_path = '' as $$
declare
  words text[] := public.faq_query_words(p_query);
  q tsquery;
begin
  if not public.check_rate_limit(
    'faq_search:' || coalesce('user:' || auth.uid()::text, 'ip:' || host(public.request_ip()), 'anon'), 60, 60
  ) then
    raise exception 'Too many searches. Wait a minute and try again.' using errcode = 'PT429';
  end if;
  if cardinality(words) = 0 then
    return;
  end if;

  -- OR across every word, both stemmed (english) and as typed (simple):
  -- "reminders paalala" → 'remind' | 'reminders' | 'paalala'.
  select string_agg(quote_literal(l), ' | ')::tsquery into q
  from (
    select unnest(tsvector_to_array(to_tsvector('english', w))) l from unnest(words) w
    union
    select w from unnest(words) w
  ) lexemes;

  return query
  with candidates as (
    select f.id from public.faqs f where f.status = 'approved' and f.search @@ q
    union
    -- Typos: a query word close to a whole word of the question (pg_trgm strict word similarity
    -- > 0.5, the extension's default threshold; uses the GIN trigram index).
    select f.id from unnest(words) w join public.faqs f on f.question operator(extensions.%>>) w
    where f.status = 'approved' and char_length(w) >= 4
  ),
  scored as (
    select f.*,
      ts_rank_cd('{0.1, 0.2, 0.4, 1.0}', f.search, q, 32) as fts,
      coalesce((select max(extensions.strict_word_similarity(w, f.question)) from unnest(words) w where char_length(w) >= 4), 0) as trgm,
      regexp_replace(regexp_replace(f.answer, '\[([^\]]+)\]\([^)]+\)', '\1', 'g'), '\s+', ' ', 'g') as plain
    from public.faqs f join candidates c on c.id = f.id
  ),
  final as (
    select s.*, (s.fts + case when s.trgm >= 0.5 then s.trgm else 0 end)::real as total from scored s
  )
  select s.id, s.slug, s.question,
    case when char_length(s.plain) <= 140 then s.plain
         else regexp_replace(left(s.plain, 141), '\s+\S*$', '') || '…' end,
    s.answer,
    s.total
  from final s
  -- 0.5 keeps out a single word that appears only in an answer (0.44); see docs/faq-search.md.
  where s.total >= 0.5
  order by (s.scholarship_id is not distinct from p_scholarship and p_scholarship is not null) desc, s.total desc, s.created_at
  limit least(greatest(coalesce(p_limit, 3), 1), 10);
end $$;

revoke execute on function public.search_faqs(text, integer, uuid) from public;
grant execute on function public.search_faqs(text, integer, uuid) to anon, authenticated, service_role;
