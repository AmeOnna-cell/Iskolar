import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getScholarshipOptions } from "@/lib/data/scholarships";
import { getMyInquiries } from "@/lib/data/student";
import { ago } from "@/lib/format";
import { AskForm } from "./ask-form";

export const metadata = { title: "Help and FAQ" };

const FAQ: Array<[string, string]> = [
  ["Is the eligibility check an official decision?", "No. It compares your answers with the requirements on file and shows which ones you meet. The provider always makes the final decision, and some requirements, like exams or interviews, can only be checked by them."],
  ["How do I know a listing is accurate?", "Each listing shows its official source and when it was last checked. Listings marked “Unverified” came from unofficial posts, so confirm them with the provider before preparing documents."],
  ["What is GWA and where do I find mine?", "GWA (general weighted average) is your grades averaged by units. It’s on your Certificate of Grades or student portal. Most schools use 1.00 as the highest grade."],
  ["Where do I get a Certificate of Indigency?", "At your barangay hall. Bring a valid ID and proof of residency. It’s usually free and released the same day, but lines get long near deadlines."],
  ["Can I receive more than one scholarship?", "Sometimes. Many government programs don’t allow two government grants at once, while private and school awards often do. Check “Obligations” on each listing or ask the provider."],
  ["How do reminders work?", "Save a scholarship or start preparing it, and we’ll remind you before it closes. Choose email, push or on-site alerts and how many days ahead in Reminder settings."],
  ["Why are some listings marked “Sample listing”?", "They are example data to show how Iskolar works. Confirm everything with the provider’s official page before you apply."],
];

export default async function HelpPage({ searchParams }: { searchParams: Promise<{ about?: string }> }) {
  const { about } = await searchParams;
  const user = await getSessionUser();
  const isStudent = user?.role === "student";
  const [options, mine] = await Promise.all([getScholarshipOptions(), isStudent ? getMyInquiries() : []]);
  const aboutId = options.some((o) => o.id === about) ? about : undefined;

  return (
    <div className="page-container py-6 sm:py-8">
      <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Help and FAQ</h1>
      <p className="mt-2 text-ink-secondary">Common questions, or ask the scholarship office directly.</p>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="faq-h" className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
          <h2 id="faq-h" className="border-b border-hairline px-5 py-4 text-title-sm font-[650] text-ink">Frequently asked questions</h2>
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border-t border-hairline first-of-type:border-t-0">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold text-ink hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden="true" className="size-2.5 shrink-0 rotate-45 border-r-2 border-b-2 border-ink-hint transition-transform duration-150 group-open:-rotate-[135deg]" />
              </summary>
              <p className="max-w-[70ch] px-5 pb-5 text-ink-secondary">{a}</p>
            </details>
          ))}
        </section>
        <div className="flex flex-col gap-6">
          <section aria-labelledby="ask-h" className="rounded-md border border-hairline bg-surface p-5 shadow-rest">
            <h2 id="ask-h" className="mb-4 text-title-sm font-[650] text-ink">Ask a question</h2>
            {isStudent ? (
              <AskForm options={options} about={aboutId} />
            ) : user ? (
              <p className="text-sm text-ink-secondary">Staff accounts answer questions from the scholarship office view.</p>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-ink-secondary">Sign in to ask the scholarship office. Replies show up here and in your alerts.</p>
                <ButtonLink href={`/login?next=/help${aboutId ? `?about=${aboutId}` : ""}`}>Sign in to ask</ButtonLink>
              </div>
            )}
          </section>
          {mine.length ? (
            <section aria-labelledby="mine-h" className="rounded-md border border-hairline bg-surface p-5 shadow-rest">
              <h2 id="mine-h" className="mb-2 text-title-sm font-[650] text-ink">Your questions</h2>
              <ul>
                {mine.map((q) => (
                  <li key={q.id} className="border-t border-hairline py-4 first:border-t-0 first:pt-2">
                    <p className="text-caption text-ink-hint">
                      {q.scholarship?.name ?? "General question"}, {ago(q.created_at)}
                    </p>
                    <p className="mt-1 font-semibold text-ink">{q.question}</p>
                    {q.replies.length ? (
                      q.replies.map((r) => (
                        <p key={r.id} className="mt-2 rounded-sm bg-ok-wash px-3 py-2 text-sm text-ink">
                          <strong>Scholarship office:</strong> {r.body}
                        </p>
                      ))
                    ) : (
                      <p className="mt-1 text-caption text-ink-hint">Waiting for a reply</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
