import { BoardList, FeedDrawer } from "@/app/announcements/board";
import { AnnouncementFeed } from "@/app/announcements/feed";
import { Notice } from "@/components/ui/notice";
import { requireRole } from "@/lib/auth/session";
import { GENERAL, getAnnouncementBoard } from "@/lib/data/announcements";
import { listAnnouncementScholarships } from "@/lib/data/staff";
import { ago } from "@/lib/format";
import { AnnouncementRowActions, NewAnnouncement } from "./announcement-form";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<{ a?: string; d?: string }> }) {
  const user = await requireRole("coordinator", "admin");
  const isAdmin = user.role === "admin";
  const sp = await searchParams;
  const [entries, scholarships] = await Promise.all([
    getAnnouncementBoard(),
    listAnnouncementScholarships(isAdmin ? undefined : user.id),
  ]);
  const canPostTo = new Set(scholarships.map(({ id }) => id));
  const [general, ...listings] = entries;
  const isAssigned = (id?: string) => !isAdmin && !!id && canPostTo.has(id);
  const board = [general!, ...listings.sort((a, b) => Number(isAssigned(b.scholarship?.id)) - Number(isAssigned(a.scholarship?.id)))];
  const entry = board.find(({ key }) => key === sp.a) ?? general!;
  const inDrawer = sp.d === "1" && entry.key === sp.a;
  const list = board.map(({ key, name, provider, count, latest, scholarship }) => ({
    key, name, provider, count, latest: latest ? ago(latest) : null, unread: 0,
    assigned: isAssigned(scholarship?.id),
  }));
  const selectedId = entry.scholarship?.id;
  const actions = Object.fromEntries(entry.items.map((item) => [
    item.id,
    <AnnouncementRowActions
      key={item.id}
      a={{ ...item, scholarship_id: selectedId }}
      scholarships={scholarships}
      canEdit={isAdmin || (item.author_id === user.id && isAssigned(selectedId))}
      allowGeneral={isAdmin}
    />,
  ]));
  const feed = <AnnouncementFeed entry={entry} actions={actions} />;

  return (
    <div className="page-container py-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Announcements</h1>
          <p className="mt-1 text-ink-secondary">Browse updates by scholarship.</p>
        </div>
        <NewAnnouncement scholarships={scholarships} allowGeneral={isAdmin} selectedId={selectedId && canPostTo.has(selectedId) ? selectedId : undefined} />
      </header>
      {!isAdmin && !scholarships.length ? (
        <div className="mt-4"><Notice>You can post once an admin assigns you a published scholarship.</Notice></div>
      ) : null}
      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:gap-0 lg:rounded-md lg:border lg:border-hairline lg:bg-surface">
        <section aria-label="Scholarships" className="min-w-0 lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)] lg:border-r lg:border-hairline lg:p-3">
          <BoardList pathname="/staff/announcements" entries={list} selected={entry.key} autoOpen={Boolean(sp.a) && entry.key === sp.a && sp.d !== "1"} />
        </section>
        {!inDrawer ? (
          <section tabIndex={0} aria-label={`Announcements: ${entry.name}`} className="sticky top-20 hidden h-[calc(100dvh-6rem)] min-w-0 overflow-auto bg-surface lg:block">
            {feed}
          </section>
        ) : null}
      </div>
      {inDrawer ? <FeedDrawer title={entry.key === GENERAL ? entry.name : `Announcements: ${entry.name}`}>{feed}</FeedDrawer> : null}
    </div>
  );
}
