import Link from "next/link";
import { Pill } from "@/components/scholarship/bits";
import { Pagination } from "@/components/ui/table-bits";
import { requireRole } from "@/lib/auth/session";
import { getStaffNames, inquiryCounts, listInquiries } from "@/lib/data/staff";
import { ago, schoolDaysSince } from "@/lib/format";
import { one, parsePaging } from "@/lib/paging";
import { InquiryActions } from "./inquiry-item";

export const metadata = { title: "Student questions" };

type SP = Record<string, string | string[] | undefined>;
const TABS = [
  ["open", "Waiting"],
  ["answered", "Answered"],
  ["closed", "Closed"],
] as const;

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireRole("coordinator", "admin");
  const sp = await searchParams;
  const status = TABS.find(([s]) => s === one(sp.status))?.[0] ?? "open";
  const { page, pageSize } = parsePaging(sp, { size: 10 });
  const [{ rows, total }, counts] = await Promise.all([listInquiries(status, page, pageSize), inquiryCounts()]);
  const names = await getStaffNames([...new Set(rows.flatMap((r) => r.replies.map((x) => x.author_id)).filter(Boolean) as string[])]);
  const pathname = "/staff/inquiries";

  return (
    <div className="page-container py-8">
      <div className="reading-column">
        <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Student questions</h1>
        <p className="mt-2 text-ink-secondary">Students see your reply on their Help page. Aim to reply within 2 school days.</p>

        <nav aria-label="Question status" className="mt-6 mb-4 flex gap-1 overflow-x-auto border-b border-hairline">
          {TABS.map(([key, label]) => (
            <Link
              key={key}
              href={`${pathname}?status=${key}`}
              aria-current={key === status ? "page" : undefined}
              className={`-mb-px flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold whitespace-nowrap no-underline ${key === status ? "border-primary text-primary" : "border-transparent text-ink-secondary hover:text-ink"}`}
            >
              {label}
              <span className="tnum rounded-full border border-hairline bg-surface-subtle px-2 text-tab text-ink-secondary">{counts[key]}</span>
            </Link>
          ))}
        </nav>

        <div className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
          {rows.length === 0 ? (
            <p className="px-6 py-10 text-center text-ink-secondary">{status === "open" ? "No questions waiting. Every student has a reply." : "Nothing here yet."}</p>
          ) : (
            <ul>
              {rows.map((q) => (
                <li key={q.id} className="border-t border-hairline px-5 py-5 first:border-t-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-caption text-ink-hint">
                      {q.student_context || "Student"} · {q.scholarship ? q.scholarship.name : "General question"} · {ago(q.created_at)}
                    </p>
                    {q.status === "open" && schoolDaysSince(q.created_at) >= 2 ? (
                      <Pill tone="warn" icon="warn">
                        Waiting {schoolDaysSince(q.created_at)} school days
                      </Pill>
                    ) : null}
                  </div>
                  <p className="mt-1 font-semibold text-ink">{q.question}</p>
                  {q.replies.map((r) => (
                    <p key={r.id} className="mt-3 rounded-sm bg-surface-subtle px-3 py-2 text-sm text-ink">
                      <strong>{r.author_id ? names.get(r.author_id) ?? "Staff" : "Staff"}:</strong> {r.body}
                      <span className="mt-1 block text-caption text-ink-hint">{ago(r.created_at)}</span>
                    </p>
                  ))}
                  <InquiryActions id={q.id} status={q.status} />
                </li>
              ))}
            </ul>
          )}
          <Pagination pathname={pathname} sp={sp} page={page} pageSize={pageSize} total={total} />
        </div>
      </div>
    </div>
  );
}
