import Link from "next/link";
import { Fragment } from "react";
import { Icon } from "@/components/icons";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Pill } from "@/components/scholarship/bits";
import { Pagination } from "@/components/ui/table-bits";
import { requireRole } from "@/lib/auth/session";
import { faqDraftCount } from "@/lib/data/faqs";
import { inquiryCounts, listStaffInquiryGroup, listStaffInquiryGroups } from "@/lib/data/staff";
import { ago, schoolDaysSince } from "@/lib/format";
import { one, parsePaging, withParams } from "@/lib/paging";

export const metadata = { title: "Student questions" };

type SP = Record<string, string | string[] | undefined>;
const TABS = [
  ["open", "Waiting"],
  ["answered", "Answered"],
  ["closed", "Closed"],
] as const;

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireRole("coordinator", "admin");
  const sp = await searchParams;
  const status = TABS.find(([s]) => s === one(sp.status))?.[0] ?? "open";
  const { page: requestedPage, pageSize } = parsePaging(sp, { size: 10 });
  const search = one(sp.q)?.trim().slice(0, 120) ?? "";
  const pathname = "/staff/inquiries";
  const selected = z.uuid().safeParse(one(sp.inquiry));
  if (selected.success) redirect(withParams(`${pathname}/${selected.data}`, sp, { inquiry: null }));

  const [{ rows, total, page }, counts, drafts] = await Promise.all([
    listStaffInquiryGroups(status, requestedPage, pageSize, search), inquiryCounts(), faqDraftCount(),
  ]);
  const expanded = rows.find((row) => row.scholarship_id && row.group_id === one(sp.group));
  const { page: groupPage } = parsePaging({ page: sp.groupPage });
  const group = expanded?.scholarship_id
    ? await listStaffInquiryGroup(status, expanded.scholarship_id, groupPage, search, expanded.scholarship_name)
    : null;
  const inquiryHref = (id: string) => withParams(`${pathname}/${id}`, sp, { inquiry: null, page });

  return (
    <div className="page-container py-8">
      <div className="w-full">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Student questions</h1>
          {/* The way into FAQs on phones, where the tab bar stays at five tabs. */}
          <Link href="/staff/faqs" className="inline-flex min-h-11 items-center text-sm font-semibold">
            FAQs{drafts ? ` · ${drafts} ${drafts === 1 ? "draft" : "drafts"}` : ""}
          </Link>
        </div>
        <p className="mt-2 text-ink-secondary">{user.role === "coordinator" ? "Expand an assigned scholarship to see its questions. Replies appear in each student’s conversation." : "Expand a scholarship to see its questions. Replies appear in each student’s conversation."}</p>

        <nav aria-label="Question status" className="mt-6 mb-4 flex gap-1 overflow-x-auto border-b border-hairline">
          {TABS.map(([key, label]) => (
            <Link
              key={key}
              href={withParams(pathname, sp, { status: key, page: null, inquiry: null, group: null, groupPage: null })}
              aria-current={key === status ? "page" : undefined}
              className={`-mb-px flex min-h-11 items-center gap-2 border-b-2 px-4 text-caption font-semibold whitespace-nowrap no-underline ${key === status ? "border-primary text-primary" : "border-transparent text-ink-secondary hover:text-ink"}`}
            >
              {label}
              <span className="tnum rounded-full border border-hairline bg-surface-subtle px-2 text-tab text-ink-secondary">{counts[key]}</span>
            </Link>
          ))}
        </nav>

        <form action={pathname} role="search" className="mb-4 flex max-w-lg gap-2">
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="size" value={pageSize} />
          <label htmlFor="staff-question-search" className="sr-only">Search student questions</label>
          <input id="staff-question-search" type="search" name="q" defaultValue={search} maxLength={120} placeholder="Search questions or scholarships" className={`${inputClass} border-hairline-strong`} />
          <Button type="submit" variant="outline">Search</Button>
        </form>
        <div className="overflow-hidden rounded-md border border-hairline bg-surface">
          {rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-hairline bg-surface-subtle text-ink-secondary">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Scholarship or question</th>
                    <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">Received</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {rows.map((row) => {
                    const grouped = Boolean(row.scholarship_id);
                    const open = expanded?.group_id === row.group_id;
                    const href = grouped
                      ? withParams(pathname, sp, { group: open ? null : row.group_id, groupPage: null, inquiry: null })
                      : inquiryHref(row.inquiry_id);
                    return (
                      <Fragment key={row.group_id}>
                        <tr className={`relative ${open ? "bg-primary-wash" : "hover:bg-surface-hover"}`}>
                          <td className="max-w-96 px-4 py-2">
                            <Link href={href} prefetch={false} scroll={!grouped} aria-expanded={grouped ? open : undefined} className="flex items-center gap-2 py-2 font-semibold text-ink after:absolute after:inset-0">
                              {grouped ? <Icon name="chevron" size={16} className={`shrink-0 ${open ? "" : "-rotate-90"}`} /> : null}
                              <span className="line-clamp-2 wrap-anywhere">{grouped ? row.scholarship_name ?? "Scholarship questions" : row.question}</span>
                              {grouped ? <span className="shrink-0 rounded-full border border-hairline bg-surface px-2 text-caption text-ink-secondary">{row.inquiry_count} {row.inquiry_count === 1 ? "question" : "questions"}</span> : null}
                            </Link>
                            {!grouped ? <span className="text-caption text-ink-secondary">{row.scholarship_name ?? "General question"}</span> : null}
                          </td>
                          <td className="hidden whitespace-nowrap px-4 py-2 text-ink-secondary sm:table-cell">{grouped ? null : <time dateTime={row.created_at}>{ago(row.created_at)}</time>}</td>
                          <td className="px-4 py-2">
                            {!grouped ? (
                              <Pill tone={status === "open" && schoolDaysSince(row.created_at) >= 2 ? "warn" : "neutral"}>
                                {TABS.find(([key]) => key === status)?.[1]}
                              </Pill>
                            ) : null}
                          </td>
                        </tr>
                        {open && group ? (
                          <>
                            {group.rows.map((item) => (
                              <tr key={item.id} className="relative bg-surface-subtle hover:bg-surface-hover">
                                <td className="max-w-96 px-4 py-2 sm:pl-10">
                                  <Link href={inquiryHref(item.id)} prefetch={false} className="block min-h-8 wrap-anywhere py-1 font-medium text-ink after:absolute after:inset-0">
                                    {item.question}
                                  </Link>
                                  <span className="text-caption text-ink-secondary sm:hidden">Received <time dateTime={item.created_at}>{ago(item.created_at)}</time></span>
                                </td>
                                <td className="hidden whitespace-nowrap px-4 py-2 text-ink-secondary sm:table-cell">
                                  <time dateTime={item.created_at}>{ago(item.created_at)}</time>
                                </td>
                                <td className="px-4 py-2">
                                  <Pill tone={item.status === "answered" ? "ok" : "neutral"}>{TABS.find(([key]) => key === item.status)?.[1]}</Pill>
                                </td>
                              </tr>
                            ))}
                            {group.pages > 1 ? (
                              <tr className="bg-surface-subtle">
                                <td colSpan={3} className="px-4 sm:pl-10">
                                  <nav aria-label="Questions in this scholarship" className="flex flex-wrap items-center gap-3 py-2 text-caption">
                                    {groupPage > 1 ? <Link href={withParams(pathname, sp, { groupPage: groupPage - 1, inquiry: null })} scroll={false}>Previous questions</Link> : null}
                                    <span>Page {groupPage} of {group.pages}</span>
                                    {groupPage < group.pages ? <Link href={withParams(pathname, sp, { groupPage: groupPage + 1, inquiry: null })} scroll={false}>Next questions</Link> : null}
                                  </nav>
                                </td>
                              </tr>
                            ) : null}
                          </>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-6 py-10 text-center text-ink-secondary">{search ? "No questions match this search." : user.role === "coordinator" ? "No questions with this status for your assigned scholarships." : "No questions with this status."}</p>
          )}
          <Pagination pathname={pathname} sp={{ ...sp, inquiry: undefined, group: undefined, groupPage: undefined }} page={page} pageSize={pageSize} total={total} />
        </div>

      </div>
    </div>
  );
}
