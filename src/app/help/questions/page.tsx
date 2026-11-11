import Link from "next/link";
import { HelpTabs } from "../help-tabs";
import { InquiryComposer } from "./composer";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { Pagination } from "@/components/ui/table-bits";
import { requireRole } from "@/lib/auth/session";
import { getMyInquiry, listMyInquiries } from "@/lib/data/student";
import { one, parsePaging, withParams } from "@/lib/paging";

const pathname = "/help/questions";
const tabs = [
  ["all", "All"], ["open", "Pending"], ["answered", "Answered"], ["closed", "Closed"],
] as const;
const labels = { open: "Awaiting reply", answered: "Answered", closed: "Closed" };
const inquiryDate = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
type Params = Record<string, string | string[] | undefined>;

export const metadata = { title: "My questions" };

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireRole("student");
  const sp = await searchParams;
  const id = one(sp.inquiry);
  if (id) {
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) notFound();
    const inquiry = await getMyInquiry(user.id, id);
    if (!inquiry) notFound();
    return (
      <div className="page-container flex min-h-[calc(100dvh-8rem)] flex-col py-6 sm:py-8">
        <Link href={withParams(pathname, sp, { inquiry: null })} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
          <Icon name="back" size={16} /> Back to questions
        </Link>
        <header className="mt-4 border-b border-hairline pb-5">
          <div className="flex flex-wrap justify-between gap-2 text-sm text-ink-secondary">
            <time dateTime={inquiry.created_at}>{inquiryDate.format(new Date(inquiry.created_at))}</time>
            <span>{labels[inquiry.status]}</span>
          </div>
          <h1 className="mt-2 wrap-anywhere text-headline-sm font-bold tracking-tight text-ink">Inquiry details</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {inquiry.scholarship ? <Link href={`/s/${inquiry.scholarship.slug}`}>{inquiry.scholarship.name}</Link> : "General question"}
          </p>
        </header>
        <ol className="flex flex-col gap-4 py-5">
          {inquiry.messages.map((reply) => (
            <li key={reply.id} className={`w-fit max-w-[min(100%,44rem)] rounded-lg border border-hairline px-4 py-3 ${reply.author_id === user.id ? "self-end rounded-br-sm bg-primary-wash" : "rounded-bl-sm bg-surface"}`}>
              <p className="text-caption font-semibold">{reply.author_id === user.id ? "You" : "Scholarship coordinator"} · {inquiryDate.format(new Date(reply.created_at))}</p>
              <p className="mt-2 wrap-anywhere whitespace-pre-wrap text-sm text-ink">{reply.body}</p>
            </li>
          ))}
        </ol>
        {!inquiry.replyTo ? <p className="mt-4 text-sm text-ink-secondary">This inquiry is closed. <Link href="/help#ask-h" className="font-semibold">Start a new inquiry</Link></p> : <InquiryComposer id={inquiry.replyTo} scholarshipId={inquiry.scholarshipId} />}
      </div>
    );
  }

  const tab = tabs.find(([key]) => key === one(sp.status))?.[0] ?? "all";
  const { page, pageSize } = parsePaging(sp, { size: 10 });
  const result = await listMyInquiries(user.id, tab === "all" ? undefined : tab, page, pageSize);
  return (
    <div className="page-container py-6 sm:py-8">
      <header className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Questions</h1>
        <ButtonLink href="/help#ask-h"><Icon name="plus" size={16} /> New inquiry</ButtonLink>
      </header>
      <HelpTabs current="questions" />
      <nav aria-label="Question status" className="mt-5 flex flex-wrap gap-x-3 border-b border-hairline sm:gap-x-6">
        {tabs.map(([key, label]) => (
          <Link key={key} href={withParams(pathname, sp, { status: key === "all" ? null : key, page: null })} aria-current={key === tab ? "page" : undefined} className={`flex min-h-11 items-center gap-1.5 border-b-2 text-caption no-underline ${key === tab ? "border-primary font-semibold text-primary" : "border-transparent text-ink-secondary"}`}>
            {label} <span className="tnum">{result.totals[key]}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-5 rounded-md border border-hairline bg-surface">
        {result.rows.length ? (
          <table className="w-full table-fixed border-collapse text-left text-sm">
            <thead className="border-b border-hairline bg-surface-subtle text-ink-secondary">
              <tr>
                <th scope="col" className="w-24 px-3 py-3 font-medium sm:w-32">Date</th>
                <th scope="col" className="px-3 py-3 font-medium">Scholarship</th>
                <th scope="col" className="w-24 px-3 py-3 font-medium sm:w-36">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {result.rows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-hover">
                  <td className="px-3 py-2 text-caption text-ink-secondary sm:text-sm">
                    <time dateTime={row.created_at}>{inquiryDate.format(new Date(row.created_at))}</time>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={withParams(pathname, sp, { inquiry: row.id, page: result.page })} prefetch={false} className="flex min-h-11 items-center py-1 font-semibold wrap-anywhere">
                      {row.scholarship_name ?? "General question"}
                    </Link>
                  </td>
                  <td className={`px-3 py-2 text-caption font-medium ${row.status === "answered" ? "text-ok" : "text-ink-secondary"}`}>{labels[row.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-8 text-sm text-ink-secondary">{tab === "all" ? "Your inquiries will appear here after you send a question." : "No inquiries with this status."}</p>
        )}
        <Pagination pathname={pathname} sp={sp} page={result.page} pageSize={pageSize} total={result.total} />
      </div>
    </div>
  );
}
