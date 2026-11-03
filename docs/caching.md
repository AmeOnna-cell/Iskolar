# Caching

The rule: **public, non-personalised data is cached; anything about a specific person never is.**

| What | Where | How long | Invalidated by |
|---|---|---|---|
| Published listing search for visitors and staff (`search_scholarships` with no student session) | Next.js data cache (`unstable_cache`), key = the search parameters | 5 min | `revalidateTag("scholarships")` |
| Scholarship detail content (listing, provider, benefits, documents, steps, notes) | Next.js data cache, key = slug | 5 min | `revalidateTag("scholarships")` |
| Landing counts (`listing_stats`), providers row, topic picker options | Next.js data cache | 5 min | `revalidateTag("scholarships")` |
| A signed-in student's search (verdicts are theirs) | **Not cached.** Runs with their session every request. | — | — |
| Eligibility results, applications, checklists, preferences, notifications, questions | **Not cached.** Per-request with the student's session, RLS-limited to their own rows. | — | — |
| Any page rendered for a signed-in person | Browser: `Cache-Control: no-store, no-cache, must-revalidate, private` (middleware) | never stored | — |

How it's built:

- Cached reads go through `createPublicClient()` (`src/lib/supabase/public.ts`). It's a cookie-less anon client, so a cached result can never contain a user's session data, and RLS limits it to published listings.
- Every cache entry carries the tag `scholarships` (`SCHOLARSHIPS_TAG` in `src/lib/data/scholarships.ts`). Staff and admin mutations (Phase 5) call `revalidateTag("scholarships")`, so students see changes immediately. The 5-minute lifetime covers the deadline status ticking over at midnight.
- Open/upcoming/closed status and "days left" are computed from Philippine dates at read time (`public.scholarship_status`, `statusOf`), never stored, so a cached listing can't show a stale status for more than 5 minutes.
- Student mutations (`src/lib/actions/student.ts`) call `revalidatePath` for the dashboard, tracker, explore and detail pages so the student's own view refreshes after an action. There's no shared cache to clear.
- On sign-out the client clears the TanStack Query cache (`getQueryClient().clear()`), and the bfcache guard reloads any restored page.

Dashboard counts come straight from SQL aggregates (`eligibility_counts`, `listing_stats`) rather than a summary table. Phase 7 measures them at 5,000 listings and adds a summary table only if `EXPLAIN ANALYZE` shows a need.
