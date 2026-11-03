"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { inputClass } from "@/components/ui/field";
import type { SearchParams } from "@/lib/data/scholarships";
import { FIELDS, PROVIDER_TYPES, REGIONS } from "@/lib/reference";

const chip =
  "h-11 cursor-pointer appearance-none rounded-full border bg-surface pr-9 pl-4 text-sm font-medium text-ink nav:h-9 bg-[length:12px] bg-[right_12px_center] bg-no-repeat";
const chevron =
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23646D7E' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]";

function toHref(p: SearchParams, pathname: string) {
  const u = new URLSearchParams();
  if (p.q) u.set("q", p.q);
  if (p.status) u.set("status", p.status);
  if (p.type) u.set("type", p.type);
  if (p.field) u.set("field", p.field);
  if (p.region) u.set("region", p.region);
  if (p.year) u.set("year", String(p.year));
  if (p.mine) u.set("mine", "1");
  if (p.sort !== "deadline") u.set("sort", p.sort);
  if (p.page > 1) u.set("page", String(p.page));
  const s = u.toString();
  return s ? `${pathname}?${s}` : pathname;
}

/** Search box (debounced) + filter chips + sort. Every change replaces the URL; the server re-renders. */
export function ExploreFilters({ params, canFilterMine, hasProfile }: { params: SearchParams; canFilterMine: boolean; hasProfile: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.q);
  // Always build URLs from the latest params: a timer created in an older render must not
  // replace the URL with stale filters.
  const latest = useRef(params);
  latest.current = params;
  const typing = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (typing.current) clearTimeout(typing.current);
  }, []);

  const apply = (patch: Partial<SearchParams>) => {
    if (typing.current) clearTimeout(typing.current);
    start(() => router.replace(toHref({ ...latest.current, page: 1, ...patch }, pathname), { scroll: false }));
  };

  // Debounce typing only (300 ms after the last keystroke); programmatic changes never schedule it.
  const onType = (value: string) => {
    setQ(value);
    if (typing.current) clearTimeout(typing.current);
    typing.current = setTimeout(() => {
      if (value.trim() !== latest.current.q) apply({ q: value.trim() });
    }, 300);
  };

  const active = Boolean(params.q || params.status || params.type || params.field || params.region || params.year || params.mine);
  const on = (v: unknown) => (v ? "border-primary bg-primary-wash text-primary" : "border-hairline-strong");

  return (
    <div aria-busy={pending || undefined}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: q.trim() });
        }}
        className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
      >
        <label className="relative">
          <span className="sr-only">Search scholarships</span>
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-hint" />
          <input
            type="search"
            value={q}
            onChange={(e) => onType(e.target.value)}
            placeholder="Scholarship name, provider or keyword"
            autoComplete="off"
            maxLength={100}
            className={`${inputClass} border-hairline-strong pl-10`}
          />
        </label>
        <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover">
          Search
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-b border-hairline pb-4" aria-label="Filters">
        <label>
          <span className="sr-only">Status</span>
          <select value={params.status ?? ""} onChange={(e) => apply({ status: (e.target.value || null) as SearchParams["status"] })} className={`${chip} ${chevron} ${on(params.status)}`}>
            <option value="">Any status</option>
            <option value="open">Open now</option>
            <option value="upcoming">Opening soon</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Provider type</span>
          <select value={params.type ?? ""} onChange={(e) => apply({ type: (e.target.value || null) as SearchParams["type"] })} className={`${chip} ${chevron} ${on(params.type)}`}>
            <option value="">Any provider</option>
            {PROVIDER_TYPES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Course area</span>
          <select value={params.field ?? ""} onChange={(e) => apply({ field: (e.target.value || null) as SearchParams["field"] })} className={`${chip} ${chevron} ${on(params.field)} max-w-[16rem]`}>
            <option value="">Any course</option>
            {FIELDS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Region</span>
          <select value={params.region ?? ""} onChange={(e) => apply({ region: (e.target.value || null) as SearchParams["region"] })} className={`${chip} ${chevron} ${on(params.region)} max-w-[16rem]`}>
            <option value="">Any region</option>
            {REGIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Year level</span>
          <select value={params.year ?? ""} onChange={(e) => apply({ year: e.target.value ? Number(e.target.value) : null })} className={`${chip} ${chevron} ${on(params.year)}`}>
            <option value="">Any year</option>
            {[1, 2, 3, 4, 5].map((y) => (
              <option key={y} value={y}>{`${y}${["th", "st", "nd", "rd"][y] ?? "th"} year`}</option>
            ))}
          </select>
        </label>
        {canFilterMine && hasProfile ? (
          <button
            type="button"
            aria-pressed={params.mine}
            onClick={() => apply({ mine: !params.mine })}
            className={`inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium nav:h-9 ${on(params.mine)}`}
          >
            <Icon name="check" size={16} /> Only ones I qualify for
          </button>
        ) : (
          <Link href={canFilterMine ? "/check" : "/signup"} className="inline-flex h-11 items-center gap-1.5 rounded-full border border-hairline-strong px-4 text-sm font-medium text-ink no-underline hover:bg-surface-hover nav:h-9">
            <Icon name="check" size={16} /> Check what I qualify for
          </Link>
        )}
        <label className="flex items-center gap-2 text-sm text-ink-secondary sm:ml-auto">
          Sort by
          <select value={params.sort} onChange={(e) => apply({ sort: e.target.value as SearchParams["sort"] })} className={`${chip} ${chevron} border-hairline-strong`}>
            <option value="deadline">Closing soonest</option>
            <option value="newest">Newest</option>
            <option value="amount">Highest amount</option>
            {canFilterMine && hasProfile ? <option value="match">Best match</option> : null}
          </select>
        </label>
      </div>
      {active ? (
        <button
          type="button"
          onClick={() => {
            setQ("");
            apply({ q: "", status: null, type: null, field: null, region: null, year: null, mine: false });
          }}
          className="mt-3 min-h-11 text-sm font-semibold text-primary hover:underline"
        >
          Clear all filters
        </button>
      ) : null}
    </div>
  );
}

/**
 * On wide screens (≥1000px) a card click opens the scholarship in the side panel (?s=slug)
 * instead of navigating away; on phones the link opens the full page as usual.
 */
export function SplitLinks({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-slug]");
        if (!a || e.metaKey || e.ctrlKey || e.shiftKey || !matchMedia("(min-width: 1000px)").matches) return;
        e.preventDefault();
        const url = new URL(window.location.href);
        url.searchParams.set("s", a.dataset.slug!);
        router.replace(url.pathname + url.search, { scroll: false });
      }}
    >
      {children}
    </div>
  );
}
