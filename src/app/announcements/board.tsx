"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Drawer, useUrlPanel, WIDE_QUERY } from "@/components/ui/drawer";
import { markAnnouncementsRead } from "@/lib/actions/announcements";
import type { Announcement } from "@/lib/data/announcements";
import { formatDate } from "@/lib/format";
import { inputClass } from "@/components/ui/field";

export type ListEntry = { key: string; name: string; provider: string | null; count: number; latest: string | null; tracked?: boolean; assigned?: boolean; unread: number };

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * The server puts the general feed first, followed by tracked scholarships. A click shows the entry beside the list
 * on wide screens (≥1000px, ?a=key) or in a drawer on narrower ones (?a=key&d=1, so Back closes it).
 * `autoOpen`: the page was opened with ?a= (from the dashboard or a scholarship's details), so on a
 * narrow screen that entry opens in its drawer right away.
 */
export function BoardList({ entries, selected, autoOpen = false, pathname = "/announcements" }: { entries: ListEntry[]; selected: string; autoOpen?: boolean; pathname?: string }) {
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
    <div aria-busy={pending || undefined} className="lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <label className="relative block shrink-0">
        <span className="sr-only">Search announcements by scholarship</span>
        <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-hint" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search scholarships or providers"
          autoComplete="off"
          maxLength={100}
          className={`${inputClass} border-hairline-strong pl-10`}
        />
      </label>
      <p className="sr-only" aria-live="polite">
        {q.trim() ? `${shown.length} ${shown.length === 1 ? "match" : "matches"}` : ""}
      </p>
      {shown.length ? (
        <ul className={`mt-3 overflow-hidden rounded-md border border-hairline bg-surface shadow-rest lg:overflow-y-auto ${pending ? "opacity-70 transition-opacity" : ""}`}>
          {shown.map((e) => {
            const current = e.key === selected;
            return (
              <li key={e.key} className="border-t border-hairline first:border-t-0">
                <Link
                  href={`${pathname}?a=${e.key}`}
                  prefetch={false}
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
                    {e.assigned ? <span className="mt-1 block text-caption font-semibold text-primary">Assigned to you</span> : null}
                    {e.tracked ? <span className="mt-1 block text-caption font-semibold text-primary">Tracked scholarship</span> : null}
                    {e.provider ? <span className="block text-sm text-ink-secondary">{e.provider}</span> : null}
                    <span className="mt-0.5 block text-sm text-ink-secondary">
                      {e.count ? `${e.count} ${e.count === 1 ? "announcement" : "announcements"}${e.latest ? ` · latest ${e.latest}` : ""}` : "No announcements yet"}
                    </span>
                  </span>
                  {e.unread ? (
                    <span className="tnum inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-danger px-1.5 text-caption font-bold text-surface" title={`${e.unread} new ${e.unread === 1 ? "announcement" : "announcements"}`}>
                      <span aria-hidden="true">{e.unread}</span>
                      <span className="sr-only">{e.unread} new {e.unread === 1 ? "announcement" : "announcements"}</span>
                    </span>
                  ) : null}
                  <Icon name="chevron" size={16} className="mt-1 shrink-0 -rotate-90 text-ink-hint lg:hidden" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-3 rounded-md border border-hairline bg-surface px-4 py-6 text-sm text-ink-secondary">
          <p>No scholarship matches “{q.trim()}”.</p>
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


export function MessageSearch({ items, provider, unread, actions }: { items: Announcement[]; provider?: string; unread: string[]; actions?: Record<string, React.ReactNode> }) {
  const searchField = useRef<HTMLLabelElement>(null);
  useEffect(() => {
    const element = searchField.current;
    if (!element || !unread.length) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      void (async () => {
        for (let from = 0; from < unread.length; from += 500) {
          if (!(await markAnnouncementsRead(unread.slice(from, from + 500)))) break;
        }
      })().catch(() => {});
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [unread]);

  const [query, setQuery] = useState("");
  const search = fold(query.trim());
  const matches = search ? items.filter(({ title, body }) => fold(`${title} ${body}`).includes(search)) : items;
  return (
    <>
      <label ref={searchField} className="relative mx-4 mt-4 block sm:mx-6">
        <span className="sr-only">Search messages in this scholarship</span>
        <Icon name="search" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-hint" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} placeholder="Search messages in this scholarship" className={`${inputClass} border-hairline-strong pl-10 text-sm`} />
      </label>
      {search ? <p role="status" className="px-4 pt-2 text-caption text-ink-secondary sm:px-6">{matches.length} {matches.length === 1 ? "message" : "messages"} found</p> : null}
      {matches.length ? (
        <ol className="mt-3 divide-y divide-hairline">
          {matches.map((message) => (
            <li key={message.id} className="px-4 py-5 sm:px-6">
              <article aria-labelledby={`an-${message.id}`}>
                <p className="flex flex-wrap justify-between gap-x-3 text-caption text-ink-secondary">
                  <span>{message.posted_as === "Scholarship office" && provider ? provider : message.posted_as}</span>
                  <time dateTime={message.published_at}>{formatDate(message.published_at.slice(0, 10), true)}</time>
                </p>
                <div className="mt-2 rounded-md bg-surface-subtle px-4 py-3">
                  <h3 id={`an-${message.id}`} className="text-sm font-semibold text-ink">{message.title}</h3>
                  <p className="mt-2 whitespace-pre-line wrap-anywhere text-sm leading-relaxed text-ink">{message.body}</p>
                </div>
                {actions?.[message.id]}
              </article>
            </li>
          ))}
        </ol>
      ) : !items.length ? (
        <p className="px-4 py-10 text-center text-sm text-ink-secondary sm:px-6">No announcements yet.</p>
      ) : null}
    </>
  );
}
