import Link from "next/link";
import { z } from "zod";
import { Icon } from "@/components/icons";
import { Notice } from "@/components/ui/notice";
import { requireRole } from "@/lib/auth/session";
import { faqFromInquiry } from "@/lib/data/faqs";
import { getScholarshipOptions } from "@/lib/data/scholarships";
import { FaqForm } from "../faq-form";

export const metadata = { title: "Add an FAQ" };

export default async function NewFaqPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const user = await requireRole("coordinator", "admin");
  const { from } = await searchParams;
  const [prefill, scholarships] = await Promise.all([
    from && z.uuid().safeParse(from).success ? faqFromInquiry(from) : null,
    getScholarshipOptions(),
  ]);

  return (
    <div className="page-container py-8">
      <div className="reading-column">
        <Link href="/staff/faqs" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold">
          <Icon name="back" size={16} /> Back to FAQs
        </Link>
        <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Add an FAQ</h1>
        {prefill ? (
          <div className="mt-4">
            <Notice>Filled in from a student’s question and the office’s reply. Remove anything personal and word it for everyone before saving.</Notice>
          </div>
        ) : null}
        <div className="mt-6 rounded-md border border-hairline bg-surface p-4 shadow-rest sm:p-6">
          <FaqForm
            initial={{ question: prefill?.question ?? "", answer: prefill?.answer ?? "", keywords: [], scholarship_id: prefill?.scholarship_id ?? null }}
            isAdmin={user.role === "admin"}
            scholarships={scholarships}
          />
        </div>
      </div>
    </div>
  );
}
