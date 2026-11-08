"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Drawer, useUrlPanel, WIDE_QUERY } from "@/components/ui/drawer";
import { inputClass } from "@/components/ui/field";

export type ListEntry = { key: string; name: string; provider: string | null; count: number; latest: string | null };

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * The searchable list. "General announcements" stays first. A click shows the entry beside the list
 * on wide screens (≥1000px, ?a=key) or in a drawer on narrower ones (?a=key&d=1, so Back closes it).
 * `autoOpen`: the page was opened with ?a= (from the dashboard or a scholarship's details), so on a
 * narrow screen that entry opens in its drawer right away.
 */
export function BoardList({ entries, selected, autoOpen = false }: { entries: ListEntry[]; selected: string; autoOpen?: boolean }) {
  const router = useRouter();
  const drawer = useUrlPanel("d");
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => {
    if (!autoOpen || matchMedia(WIDE_QUERY).matches) return;
    drawer.open("1", { a: selected }, document.querySelector<HTMLElement>('[aria-current="true"]') ?? undefined);
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shown = q.trim() ? entries.filter((e) => fold(`${e.name} ${e.provider ?? ""}`).includes(fold(q.trim()))) : entries;

  return (
    <div aria-busy={pending || undefined}>
      <label className="relative block">
        <span className="sr-only">Search announcements by scholarship</span>
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
      <p className="sr-only" aria-live="polite">
        {q.trim() ? `${shown.length} ${shown.length === 1 ? "match" : "matches"}` : ""}
      </p>
      {shown.length ? (
        <ul className={`mt-3 overflow-hidden rounded-md border border-hairline bg-surface shadow-rest ${pending ? "opacity-70 transition-opacity" : ""}`}>
          {shown.map((e) => {
            const current = e.key === selected;
            return (
              <li key={e.key} className="border-t border-hairline first:border-t-0">
                <Link
                  href={`/announcements?a=${e.key}`}
                  aria-current={current ? "true" : undefined}
                  onClick={(ev) => {
                    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
                    ev.preventDefault();
                    if (matchMedia(WIDE_QUERY).matches) start(() => router.replace(drawer.hrefWith({ a: e.key, d: null }), { scroll: false }));
                    else start(() => drawer.open("1", { a: e.key }, ev.currentTarget));
                  }}
                  className={`flex min-h-11 items-start gap-3 px-4 py-3 text-ink no-underline ${current ? "bg-primary-wash" : "hover:bg-surface-hover"}`}
                >
                  <Icon name={e.key === "general" ? "mega" : "building"} size={18} className="mt-0.5 shrink-0 text-ink-hint" />
                  <span className="min-w-0 flex-1">
                    <span className={`block font-semibold ${current ? "text-primary" : ""}`}>{e.name}</span>
                    {e.provider ? <span className="block text-sm text-ink-secondary">{e.provider}</span> : null}
                    <span className="mt-0.5 block text-sm text-ink-secondary">
                      {e.count ? `${e.count} ${e.count === 1 ? "announcement" : "announcements"}${e.latest ? ` · latest ${e.latest}` : ""}` : "No announcements yet"}
                    </span>
                  </span>
                  <Icon name="chevron" size={16} className="mt-1 shrink-0 -rotate-90 text-ink-hint lg:hidden" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-3 rounded-md border border-hairline bg-surface px-4 py-6 text-sm text-ink-secondary">
          <p>No scholarship with announcements matches “{q.trim()}”.</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-4">
            <button type="button" onClick={() => setQ("")} className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline nav:min-h-0">
              Clear search
            </button>
            <Link href="/explore" className="inline-flex min-h-11 items-center font-semibold nav:min-h-0">
              Find scholarships
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

/** The selected entry's announcements in a drawer over the list (narrow screens). */
export function FeedDrawer({ title, children }: { title: string; children: React.ReactNode }) {
  const drawer = useUrlPanel("d");
  return (
    <Drawer open={drawer.isOpen} onClose={drawer.close} title={title} titleHidden width="wide">
      {children}
    </Drawer>
  );
}
