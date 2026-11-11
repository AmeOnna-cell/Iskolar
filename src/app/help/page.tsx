import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { listApprovedFaqs } from "@/lib/data/faqs";
import { getScholarshipOptions } from "@/lib/data/scholarships";
import { AskForm } from "./ask-form";
import { HelpTabs } from "./help-tabs";
import { FaqList } from "./faq-list";

export const metadata = { title: "Help and FAQ" };

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ about?: string }> }) {
  const { about } = await searchParams;
  const user = await getSessionUser();
  const isStudent = user?.role === "student";
  const [options, faqs] = await Promise.all([getScholarshipOptions(), listApprovedFaqs()]);
  const aboutId = options.some((o) => o.id === about) ? about : undefined;

  return (
    <div className="page-container py-6 sm:py-8">
      <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Help and FAQ</h1>
      {isStudent ? <HelpTabs current="faq" /> : null}
      <p className="mt-2 max-w-[70ch] text-ink-secondary">Common questions, or ask Iskolar’s scholarship coordinators. They answer questions about a listing and general questions, usually within 2 school days.</p>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="faq-h" className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
          <h2 id="faq-h" className="border-b border-hairline px-4 py-4 text-title-sm font-[650] text-ink sm:px-6 sm:text-title">Common questions</h2>
          <FaqList faqs={faqs} ask={isStudent ? "student" : user ? null : "visitor"} />
        </section>
        <div className={`flex flex-col gap-6 ${aboutId ? "max-lg:order-first" : ""}`}>
          <section aria-labelledby="ask-h" className="scroll-mt-24 rounded-md border border-hairline bg-surface p-4 shadow-rest sm:p-6">
            <h2 id="ask-h" className="mb-4 text-title-sm font-[650] text-ink sm:text-title">Ask the scholarship office</h2>
            {isStudent ? (
              <AskForm options={options} about={aboutId} />
            ) : user ? (
              <p className="text-sm text-ink-secondary">Staff accounts answer questions from the scholarship office view.</p>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-ink-secondary">Create a free account to ask. Replies show up here and in your alerts.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <ButtonLink href="/signup">Create an account to ask</ButtonLink>
                  <Link href={`/login?next=/help${aboutId ? `?about=${aboutId}` : ""}`} className="inline-flex min-h-11 items-center px-1 text-sm font-semibold">
                    Sign in
                  </Link>
                </div>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
