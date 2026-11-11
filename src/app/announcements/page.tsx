import { getSessionUser } from "@/lib/auth/session";
import { listApplications } from "@/lib/data/student";
import { Notice } from "@/components/ui/notice";
import { GENERAL, getAnnouncementBoard, getAnnouncementReads, type BoardEntry } from "@/lib/data/announcements";
import { ago, plural } from "@/lib/format";
import { BoardList, FeedDrawer } from "./board";
import { AnnouncementFeed } from "./feed";

export const metadata = { title: "Announcements", description: "Updates from scholarship offices: deadlines, forms and schedules." };

type SP = Promise<{ a?: string; d?: string }>;

export default async function AnnouncementsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const isStudent = user?.role === "student" && user.status === "active";
  const [[general, ...scholarships], applications, reads] = await Promise.all([
    getAnnouncementBoard(),
    isStudent ? listApplications() : [],
    isStudent ? getAnnouncementReads(user.id) : null,
  ]);
  const tracked = new Set(applications.map((app) => app.scholarship!.slug));
  const board = [general!, ...scholarships.sort((a, b) => Number(tracked.has(b.key)) - Number(tracked.has(a.key)))];

  const selected = board.find((e) => e.key === sp.a) ?? general!;
  const inDrawer = sp.d === "1" && selected.key === sp.a;
  const missing = Boolean(sp.a) && selected.key !== sp.a;
  const unreadIds = (entry: BoardEntry) => reads ? entry.items.filter((item) => !reads.has(item.id)).map((item) => item.id) : [];
  const list = board.map((entry) => {
    const { key, name, provider, count, latest } = entry;
    return {
      key, name, provider, count, tracked: tracked.has(key), unread: unreadIds(entry).length,
      latest: latest ? ago(latest).replace(/^(Today|Yesterday)$/, (word) => word.toLowerCase()) : null,
    };
  });
  const unread = unreadIds(selected);

  return (
    <div className="page-container py-6 sm:py-8">
      <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Announcements</h1>
      <p className="mt-1 max-w-[60ch] text-ink-secondary">
        Updates from scholarship offices: schedules, forms and changes.<span className="max-sm:hidden"> Choose a scholarship to see its announcements.</span>
      </p>
      {missing ? (
        <div className="mt-4">
          <Notice>That scholarship is unavailable. Showing general announcements.</Notice>
        </div>
      ) : null}
      {/* Wide screens change the panel in place; say what it shows now. */}
      <p className="sr-only" aria-live="polite">
        {`${selected.name}: ${selected.count ? plural(selected.count, "announcement") : "no announcements yet"}`}
      </p>
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:gap-0 lg:rounded-md lg:border lg:border-hairline lg:bg-surface">
        <section aria-label="Scholarships" className="lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)] lg:border-r lg:border-hairline lg:p-3">
          <BoardList entries={list} selected={selected.key} autoOpen={Boolean(sp.a) && !missing && sp.d !== "1"} />
        </section>
        {inDrawer ? null : (
          <section tabIndex={0} aria-label={`Announcements: ${selected.name}`} className="sticky top-20 hidden h-[calc(100dvh-6rem)] overflow-auto bg-surface lg:block">
            <AnnouncementFeed entry={selected} unread={unread} />
          </section>
        )}
      </div>
      {inDrawer ? (
        <FeedDrawer title={selected.key === GENERAL ? "General announcements" : `Announcements: ${selected.name}`}>
          <AnnouncementFeed entry={selected} unread={unread} />
        </FeedDrawer>
      ) : null}
    </div>
  );
}
