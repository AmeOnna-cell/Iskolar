import Link from "next/link";
import { Icon } from "@/components/icons";
import { PAGE_SIZES, withParams } from "@/lib/paging";
import { buttonClass } from "./button";
import { PageSizeSelect } from "./page-size";

type SP = Record<string, string | string[] | undefined>;

/** "1–25 of 132", Previous / Page N of M / Next, and the page-size select. All URL-driven. */
export function Pagination({ pathname, sp, page, pageSize, total }: { pathname: string; sp: SP; page: number; pageSize: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3 text-sm text-ink-secondary sm:px-5">
      <span className="tnum" data-testid="range">
        {from}–{to} of {total.toLocaleString("en-PH")}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <PageSizeSelect sizes={[...PAGE_SIZES]} value={pageSize} />
        {page > 1 ? (
          <Link href={withParams(pathname, sp, { page: page - 1 })} className={buttonClass("outline", "sm")}>
            Previous
          </Link>
        ) : null}
        <span className="tnum">
          Page {page} of {pages}
        </span>
        {page < pages ? (
          <Link href={withParams(pathname, sp, { page: page + 1 })} className={buttonClass("outline", "sm")}>
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** A sortable column header: a link that toggles the direction; only the active column shows a glyph. */
export function SortHeader({
  label,
  column,
  pathname,
  sp,
  active,
  dir,
  align = "left",
}: {
  label: string;
  column: string;
  pathname: string;
  sp: SP;
  active: string;
  dir: "asc" | "desc";
  align?: "left" | "right";
}) {
  const isActive = active === column;
  const next = isActive && dir === "asc" ? "desc" : "asc";
  return (
    <th scope="col" aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : undefined} className={`px-4 py-3 text-caption font-normal text-ink-secondary ${align === "right" ? "text-right" : "text-left"}`}>
      <Link href={withParams(pathname, sp, { sort: column, dir: next, page: null })} className="inline-flex items-center gap-1 text-ink-secondary no-underline hover:text-ink">
        {label}
        {isActive ? <Icon name="chevron" size={14} className={dir === "asc" ? "rotate-180" : ""} /> : null}
      </Link>
    </th>
  );
}

/** Sort options as plain links (used above card/table hybrids). */
export function SortLinks({
  options,
  pathname,
  sp,
  active,
  dir,
}: {
  options: Array<[column: string, label: string]>;
  pathname: string;
  sp: SP;
  active: string;
  dir: "asc" | "desc";
}) {
  return (
    <nav aria-label="Sort" className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span>Sort by</span>
      {options.map(([column, label]) => {
        const isActive = active === column;
        const next = isActive && dir === "asc" ? "desc" : "asc";
        return (
          <Link
            key={column}
            href={withParams(pathname, sp, { sort: column, dir: next, page: null })}
            aria-current={isActive ? "true" : undefined}
            className={`inline-flex min-h-11 items-center gap-1 no-underline nav:min-h-9 ${isActive ? "font-semibold text-ink" : "text-ink-secondary hover:text-ink"}`}
          >
            {label}
            {isActive ? (
              <>
                <Icon name="chevron" size={14} className={dir === "asc" ? "rotate-180" : ""} />
                <span className="sr-only">{dir === "asc" ? "(ascending)" : "(descending)"}</span>
              </>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-ink-secondary">
        {children}
      </td>
    </tr>
  );
}
