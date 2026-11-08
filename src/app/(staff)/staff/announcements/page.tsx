import { Pagination } from "@/components/ui/table-bits";
import { requireRole } from "@/lib/auth/session";
import { getScholarshipOptions } from "@/lib/data/scholarships";
import { getStaffNames, listAnnouncements } from "@/lib/data/staff";
import { ago } from "@/lib/format";
import { parsePaging } from "@/lib/paging";
import { AnnouncementForm, AnnouncementRowActions } from "./announcement-form";

export const metadata = { title: "Announcements" };

type SP = Record<string, string | string[] | undefined>;

export default async function AnnouncementsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireRole("coordinator", "admin");
  const sp = await searchParams;
  const { page, pageSize } = parsePaging(sp, { size: 10 });
  const [{ rows, total }, scholarships] = await Promise.all([listAnnouncements(page, pageSize), getScholarshipOptions()]);
  const names = await getStaffNames([...new Set(rows.map((r) => r.author_id).filter(Boolean) as string[])]);

  return (
    <div className="page-container py-8">
      <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Announcements</h1>
      <p className="mt-2 text-ink-secondary">Students see announcements on their dashboard, newest first.</p>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="new-h" className="rounded-md border lg:col-start-2 lg:row-start-1 border-hairline bg-surface p-5 shadow-rest">
          <h2 id="new-h" className="mb-4 text-title-sm font-[650] text-ink">Post an announcement</h2>
          <AnnouncementForm scholarships={scholarships} />
        </section>
        <section aria-labelledby="list-h" className="lg:col-start-1 lg:row-start-1 overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
          <h2 id="list-h" className="border-b border-hairline px-5 py-4 text-title-sm font-[650] text-ink">Posted</h2>
          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-ink-secondary">No announcements yet. Post the first one.</p>
          ) : (
            <ul>
              {rows.map((a) => (
                <li key={a.id} className="border-t border-hairline px-5 py-5 first:border-t-0">
                  <p className="font-semibold text-ink">{a.title}</p>
                  <p className="mt-1 max-w-[70ch] text-sm whitespace-pre-line text-ink-secondary">{a.body}</p>
                  <p className="mt-2 text-caption text-ink-hint">
                    {a.posted_as} · {a.scholarship ? `${a.scholarship.name} · ` : ""}
                    {ago(a.published_at)}
                    {a.author_id ? ` · by ${names.get(a.author_id) ?? "staff"}` : ""}
                  </p>
                  <AnnouncementRowActions
                    a={{ id: a.id, title: a.title, body: a.body, posted_as: a.posted_as, scholarship_id: a.scholarship?.id ?? "" }}
                    scholarships={scholarships}
                    canEdit={user.role === "admin" || a.author_id === user.id}
                  />
                </li>
              ))}
            </ul>
          )}
          <Pagination pathname="/staff/announcements" sp={sp} page={page} pageSize={pageSize} total={total} />
        </section>
      </div>
    </div>
  );
}
