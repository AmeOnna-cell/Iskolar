import { Icon, type IconName } from "@/components/icons";

const FACTS: Array<[IconName, string]> = [
  ["shield", "Every listing shows its official source and when it was last checked."],
  ["check", "See which requirements you meet, and why, before you spend on documents."],
  ["clock", "Get reminders before deadlines, with the documents you still need."],
];

/**
 * Sign-in pages: the navy band (what Iskolar is) beside the form on desktop; on phones a short
 * band strip sits above the form so the form stays in the first screen.
 */
export function AuthShell({ title, lead, children }: { title: string; lead?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="page-container py-6 sm:py-8 lg:py-16">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-16">
        <aside className="rounded-md bg-band px-5 py-4 text-white lg:sticky lg:top-24 lg:px-10 lg:py-12">
          <p className="text-base font-semibold lg:max-w-[22ch] lg:text-headline lg:leading-tight lg:font-bold lg:tracking-tight">
            One place for scholarships, with the requirements explained.
          </p>
          <ul className="mt-8 hidden flex-col gap-6 lg:flex">
            {FACTS.map(([icon, text]) => (
              <li key={icon} className="flex gap-4 text-base text-band-text-soft">
                <Icon name={icon} size={22} className="mt-0.5 text-white" />
                <span className="max-w-[40ch]">{text}</span>
              </li>
            ))}
          </ul>
        </aside>
        <section aria-labelledby="auth-title" className="rounded-md border border-hairline bg-surface p-5 shadow-rest sm:p-8">
          <h1 id="auth-title" className="text-headline-sm font-bold tracking-tight text-ink">
            {title}
          </h1>
          {lead ? <p className="mt-2 text-ink-secondary">{lead}</p> : null}
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </div>
  );
}
