import Link from "next/link";
import { ScholarshipCard } from "@/components/scholarship/card";
import { DetailBody } from "@/components/scholarship/detail-body";
import { buttonClass } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { loadDetail } from "@/lib/data/detail";
import { parseSearchParams, searchHref, searchScholarships } from "@/lib/data/scholarships";
import { getStudentProfile } from "@/lib/data/student";
import { plural } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { activeFilters } from "./filter-labels";
import { DetailDrawer, SplitLinks } from "@/components/scholarship/split";
import { ExploreFilters, SortSelect } from "./filters";

export const metadata = { title: "Find scholarships" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ExplorePage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const params = parseSearchParams(sp);
  const user = await getSessionUser();
  const isStudent = user?.role === "student";

  const [{ rows, total }, profile, stages] = await Promise.all([
    searchScholarships(params, user),
    isStudent ? getStudentProfile(user.id) : null,
    isStudent
      ? createClient().then(async (c) => {
          const { data } = await c.from("applications").select("scholarship_id, stage");
          return new Map((data ?? []).map((a) => [a.scholarship_id, a.stage]));
        })
      : new Map<string, "saved" | "preparing" | "submitted">(),
  ]);

  const selectedSlug = typeof sp.s === "string" && rows.some((r) => r.slug === sp.s) ? sp.s : rows[0]?.slug;
  const panel = selectedSlug ? await loadDetail(selectedSlug, user) : null;
  // Narrow screens open the selection in a drawer (?d=1) instead of the side panel; render one or the other.
  const inDrawer = sp.d === "1" && Boolean(panel);
  const applied = activeFilters(params);
  const from = total === 0 ? 0 : (params.page - 1) * params.pageSize + 1;
  const to = Math.min(params.page * params.pageSize, total);
  const pages = Math.max(1, Math.ceil(total / params.pageSize));

  return (
    <div className="page-container py-6 sm:py-8">
      <h1 className="mb-4 text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Find scholarships</h1>
      <ExploreFilters params={params} canFilterMine={isStudent} hasProfile={Boolean(profile)} />

      {rows.length === 0 ? (
        <div className="mt-6 rounded-md border border-hairline bg-surface px-6 py-10 text-center shadow-rest">
          <h2 className="text-title-sm font-semibold text-ink">No scholarships match your search</h2>
          <p className="mx-auto mt-2 max-w-[48ch] text-ink-secondary">
            {applied.length ? (
              <>
                Filters on: <span className="font-semibold text-ink">{applied.map(([, l]) => l).join(", ")}</span>. Remove one, or{" "}
              </>
            ) : null}
            {params.q ? <>try a different keyword than “{params.q}”. </> : applied.length ? "clear them. " : null}
            Listings open to every course or region always stay in the results.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {applied.length ? (
              <Link href={searchHref({ ...params, status: null, type: null, field: null, region: null, year: null, mine: false, page: 1 })} className={buttonClass("outline", "md")}>
                Clear filters
              </Link>
            ) : null}
            {params.q ? (
              <Link href={searchHref({ ...params, q: "", page: 1 })} className={buttonClass("outline", "md")}>
                Clear search
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          <section aria-labelledby="results-h">
            <h2 id="results-h" className="sr-only">Results</h2>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm text-ink-secondary" aria-live="polite" data-testid="result-count">
                {total > params.pageSize ? `Showing ${from}–${to} of ${plural(total, "scholarship")}` : plural(total, "scholarship")}
              </p>
              <SortSelect params={params} canMatch={isStudent && Boolean(profile)} />
            </div>
            <SplitLinks>
              <ul className="flex flex-col gap-3">
                {rows.map((r) => (
                  <li key={r.id}>
                    <ScholarshipCard
                      s={r}
                      stage={stages.get(r.id) ?? null}
                      signedIn={Boolean(user)}
                      selected={r.slug === selectedSlug}
                      reason={isStudent}
                    />
                  </li>
                ))}
              </ul>
            </SplitLinks>
            {pages > 1 ? (
              <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-3">
                {params.page > 1 ? (
                  <Link href={searchHref({ ...params, page: params.page - 1 })} className={buttonClass("outline", "md")} scroll={false}>
                    Previous
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-sm text-ink-secondary">
                  Page {params.page} of {pages}
                </span>
                {params.page < pages ? (
                  <Link href={searchHref({ ...params, page: params.page + 1 })} className={buttonClass("outline", "md")} scroll={false}>
                    Next
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </section>
          {panel && !inDrawer ? (
            <aside
              aria-label="Selected scholarship"
              className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] scroll-pt-56 overflow-auto rounded-md border border-hairline bg-surface shadow-rest lg:block"
            >
              <DetailBody {...panel} compact />
              {/* Pinned footer: shows the panel continues, and opens the full page. */}
              <p className="sticky bottom-0 border-t border-hairline bg-surface px-6 py-3 text-sm">
                <Link href={`/s/${panel.s.slug}`} className="font-semibold">
                  Open the full page
                </Link>
              </p>
            </aside>
          ) : null}
        </div>
      )}
      {panel && inDrawer ? (
        <DetailDrawer slug={panel.s.slug} name={panel.s.name}>
          <DetailBody {...panel} compact />
        </DetailDrawer>
      ) : null}
    </div>
  );
}
