import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Icon } from "@/components/icons";
import { Pill } from "@/components/scholarship/bits";
import { requireRole } from "@/lib/auth/session";
import { getScholarshipDetail } from "@/lib/data/scholarships";
import { getSimilarPendingInquiries, getStaffInquiry, getStaffNames } from "@/lib/data/staff";
import { ago } from "@/lib/format";
import { listingAnswers } from "@/lib/inquiry-suggestions";
import { withParams } from "@/lib/paging";
import { InquiryActions } from "../inquiry-item";

const labels = { open: "Waiting", answered: "Answered", closed: "Closed" } as const;
type Params = Record<string, string | string[] | undefined>;

export const metadata = { title: "Inquiry conversation" };

export default async function StaffInquiryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Params> }) {
  const user = await requireRole("coordinator", "admin");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const inquiry = await getStaffInquiry(id);
  if (!inquiry) notFound();

  const [scholarship, names, similar] = await Promise.all([
    inquiry.scholarship ? getScholarshipDetail(inquiry.scholarship.slug) : null,
    getStaffNames(inquiry.replies.flatMap((reply) => reply.author_id && reply.author_id !== inquiry.student_id ? [reply.author_id] : [])),
    inquiry.status === "open" ? getSimilarPendingInquiries(inquiry.id) : [],
  ]);
  const latestQuestion = inquiry.replies.findLast((reply) => reply.author_id && reply.author_id === inquiry.student_id)?.body ?? inquiry.question;
  const messages = [
    { id: inquiry.id, body: inquiry.question, created_at: inquiry.created_at, label: "Student", own: false },
    ...inquiry.replies.map((reply) => ({
      id: reply.id, body: reply.body, created_at: reply.created_at,
      label: reply.author_id === user.id ? "You" : reply.author_id && reply.author_id === inquiry.student_id ? "Student" : (reply.author_id && names.get(reply.author_id)) || "Scholarship office",
      own: reply.author_id === user.id,
    })),
  ];

  return (
    <div className="page-container py-6 sm:py-8">
      <Link href={withParams("/staff/inquiries", sp, { inquiry: null })} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold">
        <Icon name="back" size={16} /> Back to questions
      </Link>
      <section aria-label="Question details" className="mt-3 flex min-h-[calc(100dvh-12rem)] flex-col">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-4">
          <div className="min-w-0">
            <h1 className="wrap-anywhere text-title font-bold tracking-tight text-ink sm:text-headline-sm">{inquiry.scholarship?.name ?? "General inquiry"}</h1>
            <p className="mt-1 text-sm text-ink-secondary">{inquiry.student_context || "Student"} · {ago(inquiry.created_at)}</p>
          </div>
          <Pill tone={inquiry.status === "answered" ? "ok" : "neutral"}>{labels[inquiry.status]}</Pill>
        </header>
        <ol aria-label="Messages" className="flex flex-1 flex-col gap-4 py-5">
          {messages.map((message) => (
            <li key={message.id} className={`w-fit max-w-[min(100%,44rem)] rounded-2xl border border-hairline px-4 py-3 ${message.own ? "self-end rounded-br-sm bg-primary-wash" : "rounded-bl-sm bg-surface"}`}>
              <p className="text-caption font-semibold text-ink">{message.label} <span className="font-normal text-ink-secondary">· {ago(message.created_at)}</span></p>
              <p className="mt-1 wrap-anywhere whitespace-pre-wrap text-sm text-ink">{message.body}</p>
            </li>
          ))}
        </ol>
        <InquiryActions
          key={inquiry.id}
          id={inquiry.id}
          status={inquiry.status}
          question={inquiry.question}
          similar={similar.map((item) => ({ id: item.id, question: item.question, updated: ago(item.updated_at) }))}
          suggestions={scholarship ? listingAnswers(scholarship, latestQuestion) : []}
          faqHref={inquiry.replies.some((reply) => !reply.author_id || reply.author_id !== inquiry.student_id) ? `/staff/faqs/new?from=${inquiry.id}` : undefined}
        />
      </section>
    </div>
  );
}
