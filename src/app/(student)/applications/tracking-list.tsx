"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { DUE_TONE, Meter } from "@/components/scholarship/bits";
import { useDocumentProgress } from "@/components/scholarship/document-progress";
import { SplitLinks } from "@/components/scholarship/split";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { inputClass } from "@/components/ui/field";

export type TrackRow = {
  slug: string;
  name: string;
  amount: string;
  location: string;
  updated: string;
  stage: { label: string; dot: string };
  deadline: string | null;
  due: { text: string; tone: keyof typeof DUE_TONE };
  docs: { checked: string[]; total: number };
};

function trackingHref(tab: string, query: string, slug?: string) {
  const params = new URLSearchParams();
  if (tab !== "all") params.set("tab", tab);
  if (query) params.set("q", query);
  if (slug) params.set("s", slug);
  const search = params.toString();
  return search ? `/applications?${search}` : "/applications";
}

export function TrackingFilters({
  filters,
  tab,
  query,
}: {
  filters: readonly { key: string; label: string }[];
  tab: string;
  query: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(query);
  const status = filters.find((filter) => filter.key === tab)?.label;
  return (
    <div className="mt-6 flex items-center gap-3 sm:mt-9">
      <form action="/applications" role="search" className="relative min-w-0 flex-1">
        {tab !== "all" ? <input type="hidden" name="tab" value={tab} /> : null}
        <label htmlFor="tracking-search" className="sr-only">Search tracked scholarships</label>
        <input id="tracking-search" name="q" type="search" value={text} onChange={(event) => setText(event.target.value)} placeholder="Program name, provider or keyword" maxLength={100} className={`${inputClass} border-hairline-strong pl-11 text-sm`} />
        <button type="submit" aria-label="Search" className="absolute inset-y-0 left-0 grid w-11 place-items-center rounded-sm text-ink-secondary hover:text-primary">
          <Icon name="search" size={17} />
        </button>
      </form>
      <Button type="button" variant="outline" aria-label={tab === "all" ? "Filter by tracking status" : `Filter by tracking status: ${status}`} aria-haspopup="dialog" className={tab === "all" ? "size-11 px-0" : "size-11 border-primary bg-primary-wash px-0 text-primary"} onClick={() => setOpen(true)}>
        <Icon name="filter" size={18} />
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="Tracking status">
        <nav aria-label="Application stages" className="divide-y divide-hairline">
          {filters.map(({ key, label }) => (
            <Link key={key} href={trackingHref(key, text.trim())} scroll={false} aria-current={key === tab ? "true" : undefined} onClick={() => setOpen(false)} className="flex min-h-12 items-center justify-between gap-3 px-2 text-sm text-ink no-underline hover:bg-surface-hover">
              {label}
              {key === tab ? <Icon name="yes" size={16} className="text-primary" /> : null}
            </Link>
          ))}
        </nav>
      </Dialog>
    </div>
  );
}

export function TrackingList({ rows, tab, query, selected }: { rows: TrackRow[]; tab: string; query: string; selected: string | null }) {
  const progress = useDocumentProgress();
  return (
    <SplitLinks>
      <ul className="divide-y divide-hairline border-y border-hairline bg-surface" data-testid="tracking-list">
        {rows.map((row) => {
          const current = row.slug === selected;
          const checked = new Set(row.docs.checked);
          for (const [id, ready] of Object.entries(progress?.updates[row.slug] ?? {})) {
            if (ready) checked.add(id);
            else checked.delete(id);
          }
          const done = checked.size;
          return (
            <li key={row.slug}>
              <Link href={trackingHref(tab, query, row.slug)} data-slug={row.slug} aria-current={current ? "true" : undefined} scroll={false} className={`block px-3 py-4 text-ink no-underline ${current ? "lg:bg-primary-wash" : "hover:bg-surface-hover"}`}>
                <span className="flex items-start justify-between gap-3 text-sm font-semibold">
                  {row.name}
                  <Icon name="chevron" size={16} className="mt-0.5 shrink-0 -rotate-90 text-ink-hint" />
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-secondary">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className={`size-2 rounded-full ${row.stage.dot}`} />
                    {row.stage.label}
                  </span>
                  {row.deadline ? <span><span className="sr-only">Deadline </span>{row.deadline}</span> : null}
                  <span className={row.due.text === "Closed" ? "text-danger" : DUE_TONE[row.due.tone]}>{row.due.text}</span>
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 text-caption text-ink-secondary">
                  {row.location ? <span className="inline-flex items-center gap-1"><Icon name="pin" size={14} /> {row.location}</span> : null}
                  <span>Updated {row.updated}</span>
                </span>
                {row.amount ? <span className="mt-2 block text-sm font-semibold"><span className="sr-only">Listed award: </span>{row.amount}</span> : null}
                <span className="mt-3 block">
                  <span className="mb-1 flex justify-between gap-2 text-caption text-ink-secondary">
                    <span>Documents</span>
                    <span className="tnum">{row.docs.total ? `${done}/${row.docs.total}` : "None listed"}</span>
                  </span>
                  {row.docs.total ? <Meter value={done} max={row.docs.total} label={`Documents for ${row.name}`} /> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </SplitLinks>
  );
}
