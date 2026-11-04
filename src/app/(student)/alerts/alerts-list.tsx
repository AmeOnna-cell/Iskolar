"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { markRead } from "@/lib/actions/notifications";

export type AlertRow = { id: string; kind: "deadline" | "change" | "new" | "announce"; title: string; body: string; when: string; unread: boolean };

const KIND: Record<AlertRow["kind"], { icon: IconName; tone: string; label: string }> = {
  deadline: { icon: "clock", tone: "bg-danger-wash text-danger", label: "Deadline" },
  change: { icon: "cal", tone: "bg-warn-wash text-warn", label: "Change" },
  new: { icon: "spark", tone: "bg-ok-wash text-ok", label: "New scholarship" },
  announce: { icon: "mega", tone: "bg-primary-wash text-primary", label: "Announcement" },
};

export function AlertsList({ rows, unreadTotal }: { rows: AlertRow[]; unreadTotal: number }) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const unreadHere = rows.filter((r) => r.unread);
  const allSelected = unreadHere.length > 0 && unreadHere.every((r) => selected.has(r.id));

  const run = (ids: string[] | null) =>
    start(async () => {
      const res = await markRead(ids);
      toast(res.message, res.ok ? "ok" : "danger");
      if (res.ok) {
        setSelected(new Set());
        router.refresh();
      }
    });

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hairline px-4 py-2 sm:px-5">
        <label className="flex min-h-11 items-center gap-3 text-sm text-ink-secondary">
          <input
            type="checkbox"
            checked={allSelected}
            disabled={!unreadHere.length}
            onChange={() => setSelected(allSelected ? new Set() : new Set(unreadHere.map((r) => r.id)))}
            className="size-[18px] accent-[var(--primary)]"
          />
          Select unread on this page
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          {selected.size ? (
            <Button variant="outline" size="sm" loading={pending} onClick={() => run([...selected])}>
              Mark {selected.size} as read
            </Button>
          ) : null}
          {unreadTotal ? (
            <Button variant="text" size="sm" disabled={pending} onClick={() => run(null)}>
              Mark all as read
            </Button>
          ) : null}
        </div>
      </div>
      <ul>
        {rows.map((r) => {
          const k = KIND[r.kind];
          return (
            <li key={r.id} className={`relative grid grid-cols-[auto_36px_minmax(0,1fr)] items-start gap-3 border-b border-hairline px-4 py-4 last:border-b-0 sm:grid-cols-[auto_36px_minmax(0,1fr)_auto] sm:px-5 ${r.unread ? "bg-primary-wash" : ""}`}>
              {r.unread ? (
                <input
                  type="checkbox"
                  aria-label={`Select ${r.title}`}
                  checked={selected.has(r.id)}
                  onChange={() =>
                    setSelected((s) => {
                      const n = new Set(s);
                      if (n.has(r.id)) n.delete(r.id);
                      else n.add(r.id);
                      return n;
                    })
                  }
                  className="relative z-10 mt-2.5 size-[18px] accent-[var(--primary)]"
                />
              ) : (
                <span className="w-[18px]" aria-hidden />
              )}
              <span className={`grid size-9 place-items-center rounded-full ${r.unread ? "bg-surface" : k.tone} ${r.unread ? k.tone.split(" ")[1] : ""}`} aria-hidden>
                <Icon name={k.icon} size={18} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  {/* Plain <a>: opening marks it read, so it must never be prefetched. */}
                  <a href={`/alerts/${r.id}`} className="text-ink no-underline after:absolute after:inset-0 hover:underline">
                    <span className="sr-only">{r.unread ? "Unread. " : ""}{k.label}: </span>
                    {r.title}
                  </a>
                </p>
                {r.body ? <p className="text-sm text-ink-secondary">{r.body}</p> : null}
                <p className="mt-1 text-caption text-ink-hint sm:hidden">{r.when}</p>
              </div>
              <span className="hidden pt-0.5 text-caption whitespace-nowrap text-ink-hint sm:block">{r.when}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
