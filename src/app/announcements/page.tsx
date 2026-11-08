import Link from "next/link";
import { DUE_TONE } from "@/components/scholarship/bits";
import { Notice } from "@/components/ui/notice";
import { GENERAL, getAnnouncementBoard, type BoardEntry } from "@/lib/data/announcements";
import { statusOf } from "@/lib/data/scholarships";
import { ago, formatDate, plural, todayPH, urgency } from "@/lib/format";
import { BoardList, FeedDrawer } from "./board";

export const metadata = { title: "Announcements", description: "Updates from scholarship offices: deadlines, forms and schedules." };

type SP = Promise<{ a?: string; d?: string }>;

/** One entry's announcements: its header (with the scholarship's dates), then each post, newest first. */
const DEFAULT_SENDER = "Scholarship office";

function Feed({ entry }: { entry: BoardEntry }) {
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
        <h2 className="text-title font-[650] tracking-tight text-ink">{entry.name}</h2>
        {s ? (
          <>
            <p className="text-ink-secondary">{s.provider}</p>
            <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
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
            <Link href={`/s/${s.slug}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold nav:min-h-0">
              View the scholarship
            </Link>
          </>
        ) : (
          <p className="mt-1 text-sm text-ink-secondary">Updates from the scholarship offices that aren&apos;t about one scholarship.</p>
        )}
      </div>
      {entry.items.length ? (
        <ol>
          {entry.items.map((a) => (
            <li key={a.id} className="border-t border-hairline px-4 py-5 first:border-t-0 sm:px-6">
              <article aria-labelledby={`an-${a.id}`}>
                <h3 id={`an-${a.id}`} className="font-semibold text-ink">{a.title}</h3>
                <p className="text-caption text-ink-hint">
                  {/* The default sender says nothing; name the scholarship's provider instead. */}
                  {a.posted_as === DEFAULT_SENDER && s ? s.provider : a.posted_as} · <time dateTime={a.published_at}>{formatDate(a.published_at.slice(0, 10), true)}</time>
                </p>
                <p className="mt-2 max-w-[70ch] whitespace-pre-line text-ink">{a.body}</p>
              </article>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-4 py-10 text-center text-ink-secondary sm:px-6">No announcements yet.</p>
      )}
    </>
  );
}

export default async function AnnouncementsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const board = await getAnnouncementBoard();
  const selected = board.find((e) => e.key === sp.a) ?? board[0]!;
  const inDrawer = sp.d === "1" && selected.key === sp.a;
  const missing = Boolean(sp.a) && selected.key !== sp.a;
  const list = board.map(({ key, name, provider, count, latest }) => ({ key, name, provider, count, latest: latest ? ago(latest).replace(/^(Today|Yesterday)$/, (w) => w.toLowerCase()) : null }));

  return (
    <div className="page-container py-6 sm:py-8">
      <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Announcements</h1>
      <p className="mt-1 max-w-[60ch] text-ink-secondary">
        Updates from scholarship offices: schedules, forms and changes.<span className="max-sm:hidden"> Choose a scholarship to see its announcements.</span>
      </p>
      {missing ? (
        <div className="mt-4">
          <Notice>That scholarship has no public announcements right now. Here are the general ones.</Notice>
        </div>
      ) : null}
      {/* Wide screens change the panel in place; say what it shows now. */}
      <p className="sr-only" aria-live="polite">
        {`${selected.name}: ${selected.count ? plural(selected.count, "announcement") : "no announcements yet"}`}
      </p>
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <section aria-label="Scholarships with announcements">
          <BoardList entries={list} selected={selected.key} autoOpen={Boolean(sp.a) && !missing && sp.d !== "1"} />
        </section>
        {inDrawer ? null : (
          <section tabIndex={0} aria-label={`Announcements: ${selected.name}`} className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-auto rounded-md border border-hairline bg-surface shadow-rest lg:block">
            <Feed entry={selected} />
          </section>
        )}
      </div>
      {inDrawer ? (
        <FeedDrawer title={selected.key === GENERAL ? "General announcements" : `Announcements: ${selected.name}`}>
          <Feed entry={selected} />
        </FeedDrawer>
      ) : null}
    </div>
  );
}
