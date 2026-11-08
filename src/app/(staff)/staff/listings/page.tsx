import Link from "next/link";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Pagination, SortLinks } from "@/components/ui/table-bits";
import { requireRole } from "@/lib/auth/session";
import { statusOf } from "@/lib/data/scholarships";
import { getStaffNames, LISTING_SORTS, listListings, type ListingQuery } from "@/lib/data/staff";
import { formatDate, todayPH, urgency } from "@/lib/format";
import { one, parsePaging, pickSort } from "@/lib/paging";
import { ListingsTable, type ListingRow } from "./listings-table";

export const metadata = { title: "Listings" };

type SP = Record<string, string | string[] | undefined>;
const STATUSES = ["draft", "in_review", "published", "archived"] as const;

export default async function ListingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireRole("coordinator", "admin");
  const sp = await searchParams;
  const { page, pageSize } = parsePaging(sp);
  const { sort, dir } = pickSort(sp, LISTING_SORTS, "closes_on");
  const status = STATUSES.find((s) => s === one(sp.status)) ?? null;
  const verification = one(sp.verification) === "verified" || one(sp.verification) === "unverified" ? (one(sp.verification) as "verified" | "unverified") : null;
  const today = todayPH();
  const in7 = new Date(Date.parse(`${today}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
  const query: ListingQuery = {
    q: (one(sp.q) ?? "").trim().slice(0, 100),
    status,
    verification,
    mine: one(sp.mine) === "1",
    closing: one(sp.closing) === "7" ? { from: today, to: in7 } : null,
    sort,
    dir: dir ?? (sort === "updated_at" ? ("desc" as const) : ("asc" as const)),
    page,
    pageSize,
  };
  const { rows, total } = await listListings(query, user.id);
  const names = await getStaffNames([...new Set(rows.map((r) => r.assigned_coordinator_id).filter(Boolean) as string[])]);
  const isAdmin = user.role === "admin";

  const tableRows: ListingRow[] = rows.map((r) => {
    const st = statusOf(r, today);
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      status: r.listing_status,
      verification: r.verification,
      closes: r.closes_on ? formatDate(r.closes_on, true) : "—",
      urgency: r.listing_status === "published" ? urgency(st.status, st.days_left) : "none",
      checked: r.last_verified_at ? formatDate(r.last_verified_at.slice(0, 10)) : "",
      coordinator: r.assigned_coordinator_id ? (names.get(r.assigned_coordinator_id) ?? "—") : "Unassigned",
      provider: { name: r.provider?.short_name ?? r.provider?.name ?? "", abbr: r.provider?.abbr ?? "?", color: r.provider?.color ?? "#334155" },
      canEdit: isAdmin || r.assigned_coordinator_id === user.id,
      isSample: r.is_sample,
    };
  });

  const pathname = "/staff/listings";
  return (
    <div className="page-container py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Listings</h1>
          <p className="mt-2 text-ink-secondary">Keep deadlines current and check each listing against its official source.</p>
        </div>
        <ButtonLink href="/staff/listings/new">Add a listing</ButtonLink>
      </div>

      <form action={pathname} className="mt-6 flex flex-wrap items-end gap-2" role="search">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-sm font-semibold text-ink">
          Search
          <input name="q" defaultValue={query.q} placeholder="Scholarship name" maxLength={100} className={`${inputClass} border-hairline-strong`} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          Status
          <select name="status" defaultValue={status ?? ""} className={`${inputClass} border-hairline-strong`}>
            <option value="">Any status</option>
            <option value="draft">Draft</option>
            <option value="in_review">Sent for review</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          Verification
          <select name="verification" defaultValue={verification ?? ""} className={`${inputClass} border-hairline-strong`}>
            <option value="">Any</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="mine" value="1" defaultChecked={query.mine} className="size-[18px] accent-[var(--primary)]" />
          Assigned to me
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="closing" value="7" defaultChecked={!!query.closing} className="size-[18px] accent-[var(--primary)]" />
          Closing within 7 days
        </label>
        <input type="hidden" name="size" value={pageSize} />
        <button type="submit" className={buttonClass("outline")}>Apply</button>
        {query.q || status || verification || query.mine || query.closing ? (
          <Link href={pathname} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold">
            Clear
          </Link>
        ) : null}
      </form>

      <div className="mt-4 overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
        <div className="border-b border-hairline px-4 py-2 text-caption text-ink-secondary sm:px-5">
          <SortLinks
            options={[
              ["closes_on", "Deadline"],
              ["updated_at", "Last updated"],
              ["name", "Name"],
            ]}
            pathname={pathname}
            sp={sp}
            active={sort}
            dir={query.dir}
          />
        </div>
        {rows.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <h2 className="text-title-sm font-semibold text-ink">No listings match</h2>
            <p className="mt-2 text-ink-secondary">Try a different search, or clear the filters.</p>
          </div>
        ) : (
          <ListingsTable rows={tableRows} isAdmin={isAdmin} />
        )}
        <Pagination pathname={pathname} sp={sp} page={page} pageSize={pageSize} total={total} />
      </div>
    </div>
  );
}
