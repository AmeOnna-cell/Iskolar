import Link from "next/link";
import { PreferencesForm } from "@/components/notifications/preferences-form";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { requireRole } from "@/lib/auth/session";
import { getPreferences } from "@/lib/data/notifications";
import { getStudentProfile } from "@/lib/data/student";
import { ord } from "@/lib/format";
import { fieldLabel, incomeLabel, regionLabel } from "@/lib/reference";
import { DeleteAnswers } from "./delete-answers";

export const metadata = { title: "Settings" };

const card = "rounded-md border border-hairline bg-surface p-4 shadow-rest sm:p-6";
const h2 = "text-title-sm font-[650] text-ink sm:text-title";

// One home for the account: details, eligibility answers (see, edit, delete), and reminders.
// Every email's "change what we send you" link lands on #reminders (via /settings/notifications).
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const user = await requireRole();
  const { email } = await searchParams;
  const isStudent = user.role === "student";
  const [sp, prefs] = isStudent ? await Promise.all([getStudentProfile(user.id), getPreferences()]) : [null, null];

  const notAnswered = <span className="text-ink-hint">Not answered</span>;
  const groups: Array<[title: string, step: number, rows: Array<[string, React.ReactNode]>]> = sp
    ? [
        ["Studies", 1, [["Course area", sp.field ? fieldLabel[sp.field] : notAnswered], ["Program", sp.program || notAnswered], ["Year level", sp.year_level ? `${ord(sp.year_level)} year` : notAnswered]]],
        ["Grades", 2, [["GWA", sp.gwa ? Number(sp.gwa).toFixed(2) : sp.gwa_unknown ? "Not known yet" : notAnswered]]],
        [
          "Family",
          3,
          [
            ["Household income", sp.income_bracket ? incomeLabel[sp.income_bracket] : sp.answered_family ? "Not sure" : notAnswered],
            ["4Ps or Listahanan", sp.four_ps === "yes" ? "Yes" : sp.four_ps === "no" ? "No" : sp.four_ps === "unsure" ? "Not sure" : notAnswered],
            ["OFW parent", sp.ofw === true ? "Yes" : sp.ofw === false ? "No" : notAnswered],
          ],
        ],
        ["Location", 4, [["Home region", sp.region ? regionLabel[sp.region] : notAnswered]]],
      ]
    : [];

  return (
    <div className="page-container py-6 sm:py-8">
      <div className="reading-column flex flex-col gap-6">
        <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Settings</h1>
        {email === "changed" ? <Notice tone="ok">Your email address is updated.</Notice> : null}

        <section aria-labelledby="account-h" className={card}>
          <h2 id="account-h" className={h2}>Account</h2>
          <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[160px_minmax(0,1fr)]">
            <dt className="text-ink-hint">Name</dt>
            <dd className="text-ink">{user.fullName || "Not set"}</dd>
            <dt className="text-ink-hint">Email</dt>
            <dd className="[overflow-wrap:anywhere] text-ink">{user.email}</dd>
          </dl>
          <ButtonLink href="/auth/update-password" variant="outline" className="mt-4">
            Change password
          </ButtonLink>
        </section>

        {isStudent ? (
          <section aria-labelledby="answers-h" id="answers" className={`${card} scroll-mt-24`}>
            <h2 id="answers-h" className={h2}>Your eligibility answers</h2>
            <p className="mt-1 text-sm text-ink-secondary">Only you can see these. They decide which scholarships show “You qualify”.</p>
            {sp ? (
              <>
                <div className="mt-4 overflow-hidden rounded-md border border-hairline">
                  {groups.map(([title, step, rows]) => (
                    <div key={title} className="border-t border-hairline px-4 py-3 first:border-t-0">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-ink">{title}</h3>
                        <Link href={`/check?step=${step}`} className="-my-2 inline-flex min-h-11 items-center text-sm font-semibold">
                          Edit<span className="sr-only"> {title.toLowerCase()} answers</span>
                        </Link>
                      </div>
                      <dl className="mt-1 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[160px_minmax(0,1fr)]">
                        {rows.map(([k, val]) => (
                          <div key={k} className="contents">
                            <dt className="text-ink-hint">{k}</dt>
                            <dd className="text-ink">{val}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <DeleteAnswers />
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-ink-secondary">
                You haven&apos;t answered yet. <Link href="/check">Check my eligibility</Link>
              </p>
            )}
          </section>
        ) : null}

        {isStudent && prefs ? (
          <section aria-labelledby="reminders-h" id="reminders" className={`${card} scroll-mt-24`}>
            <h2 id="reminders-h" className={h2}>Reminders</h2>
            <p className="mt-1 mb-4 text-sm text-ink-secondary">How and when Iskolar tells you about deadlines and changes. Turning everything off keeps your alerts history.</p>
            <PreferencesForm prefs={prefs} email={user.email} />
          </section>
        ) : !isStudent ? (
          <p className="text-sm text-ink-secondary">Reminders are for student accounts. Staff accounts don&apos;t get deadline alerts.</p>
        ) : null}
      </div>
    </div>
  );
}
