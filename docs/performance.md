# Performance

Measured on the local Supabase stack (Docker on a Windows laptop), not on Supabase's servers, so
treat the numbers as relative. Times vary between runs on this machine, so "after" shows the range
of the last two warm runs.

## Dataset

`scripts/synth.sql` (local only; it refuses to run on a database with real-looking accounts):

| Table | Rows |
|---|---|
| Listings | 5,009 (4,009 published) |
| Documents | 15,031 |
| Students | 2,085 (1,600 with eligibility answers) |
| Applications | 16,015 |
| Notifications | 50,300 |
| Audit log | 100,000 |

To reproduce:

```sh
docker exec -i supabase_db_Iskolar psql -U postgres -f - < scripts/synth.sql
docker exec -i supabase_db_Iskolar psql -U supabase_admin -d postgres -f - < scripts/explain.sql
npx supabase db reset   # removes it (audit entries are append-only)
```

`scripts/explain.sql` runs each query the way the app does (as `anon` or `authenticated` with a
real user's claims, so RLS applies). It uses `auto_explain` to print plans inside functions and
rolls back everything that writes.

## Results

| Query (where it runs) | Before | After | What changed |
|---|---|---|---|
| Explore, signed-in student, default sort (`search_scholarships`) | 697 ms | 41–58 ms | Fast eligibility tally; explainable items only for the 20 rows shown; top-N sort on slim rows |
| Explore, text search "engineering" | 189 ms | 14–39 ms | Same |
| Dashboard "only ones I qualify for" | 801 ms | 48–76 ms | Same |
| Dashboard counts (`eligibility_counts`) | 692 ms | 30–45 ms | Tally instead of the explainable items per listing |
| Explore, visitor (also cached for 5 min by `unstable_cache`) | 862 ms | 33–49 ms | Same as the student search |
| Landing numbers (`listing_stats`, cached) | 161 ms | 8.5–14 ms | `scholarship_status` / `today_ph` now inlined |
| Staff overview (`staff_overview`) | 250 ms | 13–18 ms | Same |
| Audit log, deep "Older entries" page | 83 ms | 0.4 ms | Redundant `created_at <= cursor` so the index scan starts at the cursor |
| Announcement fan-out to 2,085 students | 282 ms | 58–77 ms | One set-based insert (`notify_many`) instead of a call per student |
| Publish → new-match alerts (1,600 evaluated) | 72 ms | 4–5 ms | Set-based insert, tally verdicts |
| Daily reminder job (585 reminders) | 121 ms | 312–368 ms | **Slower:** see below |
| Alerts page: newest 25, total, unread badge | 0.3–0.5 ms | same | `notifications (user_id, read_at, created_at desc)` |
| My applications | 0.3 ms | same | `applications (student_id, stage)` |
| Staff listings: page, total, name search, its total | 4 / 1 / 8 / 7 ms | same | Trigram index on `lower(name)`; the total is the exact `count(*)` PostgREST asks for |
| Users: page, total, search | 1 / 0.7 / 4.6 ms | same | Trigram index on name + email |
| Audit log: newest page, filter by action | 0.3 / 6.5 ms | same | `(created_at desc, id desc)`, `(action, created_at desc)` |
| Dispatcher claim of 100 | 6 ms | 5–9 ms | Partial index on rows still to deliver |

### What was slow and why

- **Eligibility for every listing, on every search.**
  - `search_scholarships` built the explainable requirement list (jsonb) for all ~4,000 published listings, summarised it, then kept 20.
  - It now gets each row's verdict from `eligibility_codes(student, criteria)`: one small array of codes (0 met, 1 unknown, 2 not met), built from plain comparisons.
  - It sorts and pages on slim rows, and builds the explainable items only for the page.
  - pgTAP `90_performance` checks the codes match `eligibility_items` requirement by requirement for 40,000+ answer × criteria combinations. A deliberately planted bug fails it.
- **Helper functions called once per row.**
  - `set search_path` stops Postgres from inlining a SQL function, so `today_ph()` and `scholarship_status()` ran as a function call per row everywhere.
  - These two and the new tally functions now have no `search_path` setting, and the planner inlines them.
  - That's safe because they are security invoker, use only built-in operators and schema-qualified names, and are planned under `search_path = ''` when inlined into security-definer code.
  - The Supabase linter will list them under `function_search_path_mutable`; that's deliberate, and the reason is in the migration.
- **OR keyset on the audit log.** `created_at < X OR (created_at = X AND id < Y)` can't start an index range, so deep pages walked from the newest entry. `listAudit` now also sends `created_at <= X`.
- **Fan-out one student at a time.** Announcements and new matches now insert every recipient's alert in one statement. `notify_many` joins `unnest(ids)` so it uses index lookups for 1 student or 20,000.

### Known trade-off: the daily reminder job

The reminder job still calls `notify()` once per reminder, because each reminder's text differs. `notify()` now delegates to `notify_many`, one more function layer, so the job takes about 0.5–0.6 ms per reminder (previously about 0.2 ms). It's a once-a-day background job: 585 reminders take about 0.35 s, and 20,000 would take about 10–12 s. That isn't worth a second copy of the preference logic. If the job ever needs to be faster, make it one `insert … select` that computes the text per row.

## Indexes

All indexes from Phase 2 (`20261103000800_indexes.sql`) were used by the plans above. The one
change is that the email-only queue index was replaced by `notifications_dispatch_idx`, which
covers email and push (Phase 6). No index was added in Phase 7: every remaining slow query was
CPU spent per row, not a missing index.

## Limits and next steps

- **Explore with tens of thousands of listings:** search still evaluates eligibility for every match before sorting, because "match" sort and "only ones I qualify for" need every verdict. At about 10–15 µs per listing that's fine to around 50,000 published listings. Past that, precompute verdicts per student in a table refreshed on answer or listing changes.
- **Exact totals:** the staff tables' totals use exact `count(*)`, which is a few ms at 5,000 listings and grows linearly. Switch to `count: "estimated"` past about 100,000 rows.
- **Fan-out:** announcement fan-out at 20,000 students would take about 0.6 s inside the posting transaction. Move it to the dispatcher if that becomes noticeable.
