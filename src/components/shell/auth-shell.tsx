import { Icon, type IconName } from "@/components/icons";

const FACTS: Array<[IconName, string]> = [
  ["shield", "Every listing shows its official source and when it was last checked."],
  ["check", "See which requirements you meet, and why, before you spend on documents."],
  ["clock", "Get reminders before deadlines, with the documents you still need."],
];

/**
 * Sign-in pages: the navy band (what Iskolar is) beside the form on desktop. Below lg the band is
 * hidden so the form opens the page. `band={false}` for people who are already signed in: they don't
 * need the pitch, so the form stands alone, centred.
 */
export function AuthShell({ title, lead, band = true, children }: { title: string; lead?: React.ReactNode; band?: boolean; children: React.ReactNode }) {
  return (
    <div className="page-container py-6 sm:py-8 lg:py-16">
      <div className={band ? "grid items-start gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]" : "mx-auto max-w-[440px]"}>
        {band ? (
          <aside className="sticky top-24 hidden rounded-md bg-band px-10 py-12 text-white lg:block">
            <p className="max-w-[22ch] text-headline leading-tight font-bold tracking-tight">
              One place for scholarships, with the requirements explained.
            </p>
            <ul className="mt-8 flex flex-col gap-6">
              {FACTS.map(([icon, text]) => (
                <li key={icon} className="flex gap-4 text-base text-band-text-soft">
                  <Icon name={icon} size={22} className="mt-0.5 text-white" />
                  <span className="max-w-[40ch]">{text}</span>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
        <section aria-labelledby="auth-title" className="rounded-md border border-hairline bg-surface p-5 shadow-rest sm:p-8">
          <h1 id="auth-title" className="text-headline-sm font-bold tracking-tight text-ink">
            {title}
          </h1>
          {lead ? <div className="mt-2 text-ink-secondary">{lead}</div> : null}
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </div>
  );
}
