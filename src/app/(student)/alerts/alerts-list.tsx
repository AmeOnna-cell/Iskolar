"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { markRead } from "@/lib/actions/notifications";

export type AlertRow = {
  id: string;
  kind: "deadline" | "change" | "new" | "announce";
  title: string;
  body: string;
  when: string;
  unread: boolean;
  /** Deadline alerts only: the Urgency Ladder colour for the days left now. */
  tone: string | null;
};

// Neutral icons: colour is reserved for status (DESIGN.md), so only a deadline's urgency is coloured.
const KIND: Record<AlertRow["kind"], { icon: IconName; label: string }> = {
  deadline: { icon: "clock", label: "Deadline" },
  change: { icon: "cal", label: "Change" },
  new: { icon: "spark", label: "New scholarship" },
  announce: { icon: "mega", label: "Announcement" },
};

export function AlertsList({ rows, unreadTotal }: { rows: AlertRow[]; unreadTotal: number }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  const markAll = () =>
    start(async () => {
      const res = await markRead(null);
      toast(res.message, res.ok ? "ok" : "danger");
      if (res.ok) router.refresh();
    });

  return (
    <>
      {unreadTotal ? (
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-1 sm:px-6">
          <span className="text-sm text-ink-secondary">{unreadTotal === 1 ? "1 unread" : `${unreadTotal} unread`}</span>
          <Button variant="text" disabled={pending} onClick={markAll}>
            Mark all as read
          </Button>
        </div>
      ) : null}
      <ul>
        {rows.map((r) => {
          const k = KIND[r.kind];
          return (
            <li
              key={r.id}
              className={`relative grid grid-cols-[20px_minmax(0,1fr)] items-start gap-3 border-b border-hairline px-4 py-4 last:border-b-0 hover:bg-surface-hover sm:grid-cols-[20px_minmax(0,1fr)_auto] sm:px-6 ${r.unread ? "bg-primary-wash" : ""}`}
            >
              <Icon name={k.icon} size={20} className={`mt-0.5 ${r.tone ?? "text-ink-secondary"}`} />
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  {/* Plain <a>: opening marks it read, so it must never be prefetched. */}
                  <a href={`/alerts/${r.id}`} className="text-ink no-underline after:absolute after:inset-0 hover:underline">
                    <span className="sr-only">
                      {r.unread ? "Unread. " : ""}
                      {k.label}:{" "}
                    </span>
                    {r.title}
                  </a>
                </p>
                {r.body ? <p className="text-sm text-ink-secondary">{r.body}</p> : null}
                <p className="mt-1 text-caption text-ink-hint sm:hidden">{r.when}</p>
              </div>
              <span className="hidden text-caption whitespace-nowrap text-ink-hint sm:block">{r.when}</span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
