import Link from "next/link";
import { DUE_TONE } from "@/components/scholarship/bits";
import type { BoardEntry } from "@/lib/data/announcements";
import { statusOf } from "@/lib/data/scholarships";
import { formatDate, plural, todayPH, urgency } from "@/lib/format";
import { MessageSearch } from "./board";

/** One entry's announcements: its header (with the scholarship's dates), then each post, newest first. */
export function AnnouncementFeed({ entry, unread = [], actions }: { entry: BoardEntry; unread?: string[]; actions?: Record<string, React.ReactNode> }) {
  const s = entry.scholarship;
  const st = s ? statusOf(s, todayPH()) : null;
  const left = !st
    ? null
    : st.status === "open"
      ? st.days_left === null ? "Open" : st.days_left === 0 ? "Closes today" : `${plural(st.days_left, "day")} left`
      : st.status === "upcoming"
        ? `Opens in ${plural(st.days_to_open ?? 0, "day")}`
        : "Closed";
  return (
    <>
      <div data-testid="panel-header" className="border-b border-hairline px-4 py-4 sm:px-6">
        <h2 className="text-title-sm font-[650] tracking-tight text-ink">{entry.name}</h2>
        {s ? (
          <>
            <p className="mt-1 text-sm text-ink-secondary">{s.provider}</p>
            <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-caption">
              <div>
                <dt className="text-caption text-ink-hint">Applications open</dt>
                <dd className="font-semibold text-ink">{s.opens_on ? formatDate(s.opens_on, true) : "To be announced"}</dd>
              </div>
              <div>
                <dt className="text-caption text-ink-hint">Deadline</dt>
                <dd className="font-semibold text-ink">{s.closes_on ? formatDate(s.closes_on, true) : "To be announced"}</dd>
              </div>
              <div>
                <dt className="text-caption text-ink-hint">Time left</dt>
                <dd className={`font-semibold ${st && st.status === "open" ? DUE_TONE[urgency(st.status, st.days_left)] : "text-ink"}`} data-testid="time-left">
                  {left}
                </dd>
              </div>
            </dl>
            <Link href={`/s/${s.slug}`} className="mt-3 inline-flex min-h-11 items-center text-caption font-semibold nav:min-h-0">
              View the scholarship
            </Link>
          </>
        ) : (
          <p className="mt-1 text-sm text-ink-secondary">Updates from the scholarship offices that aren&apos;t about one scholarship.</p>
        )}
      </div>
      <MessageSearch key={entry.key} items={entry.items} provider={s?.provider} unread={unread} actions={actions} />
    </>
  );
}

