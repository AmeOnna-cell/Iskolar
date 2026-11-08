"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { DUE_TONE, Meter } from "@/components/scholarship/bits";
import { SplitLinks } from "@/components/scholarship/split";
import { inputClass } from "@/components/ui/field";

export type TrackRow = {
  /** The stage tab it's listed under. */
  tab: string;
  slug: string;
  name: string;
  provider: string;
  stage: { label: string; dot: string };
  deadline: string;
  due: { text: string; tone: keyof typeof DUE_TONE };
  /** null: no answers yet, so nothing to count. */
  eligibility: { met: number; total: number; verdict: "yes" | "maybe" | "no" } | null;
  docs: { done: number; total: number };
};

// The verdict, in its own words and colour: a "no" at 3/4 must not read as "almost there".
const VERDICT = {
  yes: { text: "You qualify", tone: "text-ok", fill: "bg-ok" },
  maybe: { text: "Might qualify", tone: "text-warn", fill: "bg-warn" },
  no: { text: "Not eligible right now", tone: "text-danger", fill: "bg-danger" },
} as const;

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Bar({ label, value, max, name, empty, note, fill }: { label: string; value: number; max: number; name: string; empty: string; note?: { text: string; tone: string }; fill?: string }) {
  return (
    <span className="block min-w-0">
      <span className="flex flex-wrap justify-between gap-x-2 text-caption text-ink-secondary">
        <span className={note ? `font-semibold ${note.tone}` : undefined}>{note?.text ?? label}</span>
        <span className="tnum">{max ? `${value}/${max}` : empty}</span>
      </span>
      {max ? (
        <span className="mt-1 block">
          <Meter value={value} max={max} label={`${label} for ${name}${note ? `: ${note.text}` : ""}`} fill={fill} />
        </span>
      ) : null}
    </span>
  );
}

/**
 * The searchable tracking list. The stage tabs (server links) filter it; a search looks across every
 * stage instead, so nothing is "missing" just because it sits under another tab.
 */
export function TrackingList({ rows, tab, selected, tabs }: { rows: TrackRow[]; tab: string; selected: string | null; tabs: React.ReactNode }) {
  const [q, setQ] = useState("");
  const inTab = rows.filter((r) => r.tab === tab);
  const shown = q.trim() ? rows.filter((r) => fold(`${r.name} ${r.provider}`).includes(fold(q.trim()))) : inTab;

  return (
    <>
      {rows.length ? (
        <label className="relative mb-3 block">
          <span className="sr-only">Search your applications</span>
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-hint" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by scholarship or provider"
            autoComplete="off"
            maxLength={100}
            className={`${inputClass} border-hairline-strong pl-10`}
          />
        </label>
      ) : null}
      {q.trim() ? (
        <p className="mb-3 text-sm text-ink-secondary" aria-live="polite">
          {shown.length ? `${shown.length} ${shown.length === 1 ? "match" : "matches"} across all stages` : ""}
        </p>
      ) : (
        tabs
      )}
      {q.trim() && !shown.length ? (
        <div className="rounded-md border border-hairline bg-surface px-4 py-6 text-sm text-ink-secondary" role="status">
          <p>None of your applications matches “{q.trim()}”.</p>
          <button type="button" onClick={() => setQ("")} className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary hover:underline nav:min-h-0">
            Clear search
          </button>
        </div>
      ) : shown.length ? (
        <SplitLinks>
          <ul className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest" data-testid="tracking-list">
            {shown.map((r) => {
              const current = r.slug === selected;
              return (
                <li key={r.slug} className="border-t border-hairline first:border-t-0">
                  <Link
                    href={`/applications?tab=${r.tab}&s=${r.slug}`}
                    data-slug={r.slug}
                    aria-current={current ? "true" : undefined}
                    scroll={false}
                    className={`flex items-start gap-3 px-4 py-3 text-ink no-underline ${current ? "lg:bg-primary-wash" : "hover:bg-surface-hover"}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className={`block font-semibold ${current ? "lg:text-primary" : ""}`}>{r.name}</span>
                      <span className="block text-sm text-ink-secondary">{r.provider}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
                        <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                          <span aria-hidden="true" className={`size-2 rounded-full ${r.stage.dot}`} />
                          {r.stage.label}
                        </span>
                        <span className="text-ink-hint" aria-hidden="true">·</span>
                        <span className="text-ink-secondary">{r.deadline}</span>
                        <span className={`font-semibold ${DUE_TONE[r.due.tone]}`}>{r.due.text}</span>
                      </span>
                      <span className="mt-2 grid grid-cols-2 gap-4">
                        <Bar
                          label="Eligibility"
                          value={r.eligibility?.met ?? 0}
                          max={r.eligibility?.total ?? 0}
                          name={r.name}
                          empty={r.eligibility ? "Open to all" : "Not checked"}
                          note={r.eligibility ? VERDICT[r.eligibility.verdict] : undefined}
                          fill={r.eligibility ? VERDICT[r.eligibility.verdict].fill : undefined}
                        />
                        <Bar label="Documents" value={r.docs.done} max={r.docs.total} name={r.name} empty="None listed" />
                      </span>
                    </span>
                    <Icon name="chevron" size={16} className="mt-1 shrink-0 -rotate-90 text-ink-hint lg:hidden" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </SplitLinks>
      ) : null}
    </>
  );
}
