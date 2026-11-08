"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Button, buttonClass } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Drawer, useUrlPanel, WIDE_QUERY } from "@/components/ui/drawer";
import { inputClass } from "@/components/ui/field";
import type { SearchParams } from "@/lib/data/scholarships";
import { FIELD_OPTIONS, PROVIDER_TYPES, REGION_OPTIONS } from "@/lib/reference";
import { activeFilters } from "./filter-labels";

const chevron =
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23646D7E' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:12px] bg-[right_12px_center] bg-no-repeat";

type Filters = Pick<SearchParams, "status" | "type" | "field" | "region" | "year" | "mine">;
const NONE: Filters = { status: null, type: null, field: null, region: null, year: null, mine: false };
const countActive = (f: Filters) => Object.values(f).filter(Boolean).length;

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

function useApply(params: SearchParams) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const latest = useRef(params);
  latest.current = params;
  const apply = (patch: Partial<SearchParams>) =>
    start(() => router.replace(toHref({ ...latest.current, page: 1, ...patch }, pathname), { scroll: false }));
  return { apply, pending, latest, pathname };
}

/** Sort, shown in the results line next to the count (stays outside the filter drawer). */
export function SortSelect({ params, canMatch }: { params: SearchParams; canMatch: boolean }) {
  const { apply, pending } = useApply(params);
  return (
    <label className="flex shrink-0 items-center gap-2 text-sm text-ink-secondary" aria-busy={pending || undefined}>
      <span className="max-sm:sr-only">Sort by</span>
      <select
        value={params.sort}
        onChange={(e) => apply({ sort: e.target.value as SearchParams["sort"] })}
        // 16px on phones: smaller text makes iOS zoom in on focus.
        className={`h-11 max-w-[11rem] min-w-0 cursor-pointer appearance-none truncate rounded-full border border-hairline-strong bg-surface pr-8 pl-4 text-base font-medium text-ink [field-sizing:content] sm:max-w-none sm:text-sm nav:h-9 ${chevron}`}
      >
        <option value="deadline">Closing soonest</option>
        <option value="newest">Newest</option>
        <option value="amount">Highest amount</option>
        {canMatch ? <option value="match">Best match</option> : null}
      </select>
    </label>
  );
}

/** One choice from a short list, as a row of 44px chips (radio buttons underneath). */
function ChipGroup<T extends string | number>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T | null;
  options: Array<[T | null, string]>;
  onChange: (v: T | null) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, label]) => (
          <label
            key={String(v)}
            className="relative inline-flex min-h-11 cursor-pointer items-center rounded-full border border-hairline-strong px-4 text-sm font-medium text-ink has-checked:border-primary has-checked:bg-primary-wash has-checked:text-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary"
          >
            {/* The radio covers the whole chip (drawn invisible), so taps and assistive tech land on the real control. */}
            <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} className="absolute inset-0 cursor-pointer appearance-none rounded-full outline-none" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** The filters, edited as a draft; "Done" applies them, closing any other way discards the draft. */
function FilterForm({ initial, canFilterMine, onChange }: { initial: Filters; canFilterMine: boolean; onChange: (f: Filters) => void }) {
  const [f, setF] = useState(initial);
  const set = (patch: Partial<Filters>) => {
    const next = { ...f, ...patch };
    setF(next);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-6 px-4 py-5 sm:px-6">
      {canFilterMine ? (
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-md border border-hairline px-4 py-3 has-checked:border-primary has-checked:bg-primary-wash">
          <span>
            <span className="block text-sm font-semibold text-ink">Only ones I qualify for</span>
            <span className="block text-sm text-ink-secondary">Based on your eligibility answers.</span>
          </span>
          <input type="checkbox" checked={f.mine} onChange={(e) => set({ mine: e.target.checked })} className="size-5 shrink-0 accent-[var(--primary)]" />
        </label>
      ) : null}
      <ChipGroup
        legend="Status"
        name="f-status"
        value={f.status}
        options={[[null, "Any"], ["open", "Open now"], ["upcoming", "Opening soon"], ["closed", "Closed"]]}
        onChange={(status) => set({ status: status as Filters["status"] })}
      />
      <ChipGroup
        legend="Provider type"
        name="f-type"
        value={f.type}
        options={[[null, "Any"], ...PROVIDER_TYPES.map(([v, l]) => [v, l] as [string, string])]}
        onChange={(type) => set({ type: type as Filters["type"] })}
      />
      <div className="flex flex-col gap-2">
        <label htmlFor="f-field" className="text-sm font-semibold text-ink">Course area</label>
        <Combobox id="f-field" options={FIELD_OPTIONS} emptyLabel="Any course" value={f.field ?? ""} onChange={(v) => set({ field: (v || null) as Filters["field"] })} className={`${inputClass} border-hairline-strong`} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="f-region" className="text-sm font-semibold text-ink">Region</label>
        <Combobox id="f-region" options={REGION_OPTIONS} emptyLabel="Any region" value={f.region ?? ""} onChange={(v) => set({ region: (v || null) as Filters["region"] })} className={`${inputClass} border-hairline-strong`} />
      </div>
      <ChipGroup
        legend="Year level"
        name="f-year"
        value={f.year}
        options={[[null, "Any"], ...[1, 2, 3, 4, 5].map((y) => [y, `${y}${["th", "st", "nd", "rd"][y] ?? "th"} year`] as [number, string])]}
        onChange={(year) => set({ year })}
      />
    </div>
  );
}

/** Search box (debounced) + a filter button that opens the filter drawer (?filters=1). */
export function ExploreFilters({ params, canFilterMine, hasProfile }: { params: SearchParams; canFilterMine: boolean; hasProfile: boolean }) {
  // Always build URLs from the latest params: a timer created in an older render must not
  // replace the URL with stale filters.
  const { apply: applyNow, pending, latest, pathname } = useApply(params);
  const panel = useUrlPanel("filters");
  const [q, setQ] = useState(params.q);
  // The drawer's form starts from the applied filters, or from nothing after "Clear all".
  const [cleared, setCleared] = useState(0);

  const typing = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (typing.current) clearTimeout(typing.current);
  }, []);

  const apply = (patch: Partial<SearchParams>) => {
    if (typing.current) clearTimeout(typing.current);
    applyNow(patch);
  };

  // Debounce typing only (300 ms after the last keystroke); programmatic changes never schedule it.
  const onType = (value: string) => {
    setQ(value);
    if (typing.current) clearTimeout(typing.current);
    typing.current = setTimeout(() => {
      if (value.trim() !== latest.current.q) apply({ q: value.trim() });
    }, 300);
  };

  const current: Filters = { status: params.status, type: params.type, field: params.field, region: params.region, year: params.year, mine: canFilterMine && hasProfile && params.mine };
  const n = countActive(current);
  const draft = useRef<Filters>(current); // a shared ?filters=1 link starts from the applied filters too

  return (
    <div aria-busy={pending || undefined}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: q.trim() });
        }}
        className="flex gap-2"
      >
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search scholarships</span>
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-hint" />
          <input
            type="search"
            enterKeyHint="search"
            value={q}
            onChange={(e) => onType(e.target.value)}
            placeholder="Scholarship name, provider or keyword"
            autoComplete="off"
            maxLength={100}
            className={`${inputClass} border-hairline-strong pl-10`}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            draft.current = current;
            setCleared(0);
            panel.open();
          }}
          aria-label={n ? `Filters, ${n} on` : "Filters"}
          className={`relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm border px-3 text-sm font-semibold sm:px-4 ${n ? "border-primary bg-primary-wash text-primary" : "border-hairline-strong bg-surface text-ink hover:bg-surface-hover"}`}
        >
          <Icon name="filter" size={18} />
          <span className="max-sm:sr-only" aria-hidden="true">Filters</span>
          {n ? (
            <span aria-hidden="true" className="tnum grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-caption leading-5 text-on-primary" data-testid="filter-count">
              {n}
            </span>
          ) : null}
        </button>
        <button type="submit" className={buttonClass("primary", "md", "max-sm:hidden")}>
          Search
        </button>
      </form>

      {n ? (
        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filters on">
          {activeFilters(params).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => apply({ [key]: key === "mine" ? false : null })}
              aria-label={`Remove filter: ${label}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary bg-primary-wash pr-3 pl-4 text-sm font-medium text-primary nav:min-h-9"
            >
              {label}
              <Icon name="no" size={14} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => apply({ status: null, type: null, field: null, region: null, year: null, mine: false })}
            className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-primary hover:underline nav:min-h-9"
          >
            Clear filters
          </button>
        </div>
      ) : null}
      {!(canFilterMine && hasProfile) ? (
        <p className="mt-3 text-sm text-ink-secondary">
          <Link href={canFilterMine ? "/check" : "/signup"}>{canFilterMine ? "Answer a few questions" : "Create a free account"}</Link> to see which of these you qualify for.
        </p>
      ) : null}

      <Drawer
        open={panel.isOpen}
        onClose={panel.close}
        title="Filters"
        footer={
          <>
            <Button
              variant="text"
              onClick={() => {
                draft.current = NONE;
                setCleared((k) => k + 1);
              }}
            >
              Clear all<span className="sr-only"> filters</span>
            </Button>
            <Button onClick={() => panel.closeTo(toHref({ ...params, ...draft.current, page: 1 }, pathname))}>Done</Button>
          </>
        }
      >
        <FilterForm key={cleared} initial={cleared ? NONE : current} canFilterMine={canFilterMine && hasProfile} onChange={(f) => (draft.current = f)} />
      </Drawer>
    </div>
  );
}

/**
 * A card click opens the scholarship without leaving the list: in the side panel on wide screens
 * (≥1000px, ?s=slug), in a details drawer on narrower ones (?s=slug&d=1, so Back closes it and the
 * list keeps its scroll position). Modified clicks open the full page as usual.
 */
export function SplitLinks({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const drawer = useUrlPanel("d");
  const [pending, start] = useTransition();
  return (
    <div
      aria-busy={pending || undefined}
      className={pending ? "opacity-70 transition-opacity" : undefined}
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-slug]");
        if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        const slug = a.dataset.slug!;
        if (matchMedia(WIDE_QUERY).matches) start(() => router.replace(drawer.hrefWith({ s: slug, d: null }), { scroll: false }));
        else start(() => drawer.open("1", { s: slug }, a));
      }}
    >
      {children}
    </div>
  );
}

/** The selected scholarship in a drawer over the list (narrow screens). */
export function DetailDrawer({ slug, name, children }: { slug: string; name: string; children: React.ReactNode }) {
  const drawer = useUrlPanel("d");
  return (
    <Drawer
      open={drawer.isOpen}
      onClose={drawer.close}
      title={name}
      titleHidden
      width="wide"
      footer={
        <Link href={`/s/${slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-3">
          Open the full page
        </Link>
      }
    >
      {children}
    </Drawer>
  );
}
