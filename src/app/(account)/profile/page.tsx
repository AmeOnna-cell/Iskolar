import Link from "next/link";
import { PreferencesForm } from "@/components/notifications/preferences-form";
import { Notice } from "@/components/ui/notice";
import { requireRole } from "@/lib/auth/session";
import { getPreferences } from "@/lib/data/notifications";
import { getStudentProfile } from "@/lib/data/student";
import { ord } from "@/lib/format";
import { fieldLabel, incomeLabel, regionLabel } from "@/lib/reference";
import { DeleteAnswers } from "./delete-answers";
import { DeleteAccount, NameForm, PasswordForm } from "./forms";

export const metadata = { title: "My profile" };

const card = "rounded-md border border-hairline bg-surface p-4 shadow-rest sm:p-6";
const h2 = "text-title-sm font-[650] text-ink sm:text-title";

// My profile: name, password, eligibility answers (see, edit, delete), reminders, and deleting the account.
// Every email's "change what we send you" link lands on #reminders (via /settings/notifications).
export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
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
        <div>
          <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">My profile</h1>
          <nav aria-label="On this page" className="mt-2 flex flex-wrap gap-x-4 text-sm">
            {([["account", "Name"], ["password", "Password"], ...(isStudent ? [["answers", "Eligibility answers"], ["reminders", "Reminders"]] : []), ["delete", "Delete account"]] as Array<[string, string]>).map(([id, label]) => (
              <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center font-semibold nav:min-h-0 nav:py-1">
                {label}
              </a>
            ))}
          </nav>
        </div>
        {email === "changed" ? <Notice tone="ok">Your email address is updated.</Notice> : null}

        <section aria-labelledby="account-h" id="account" className={`${card} scroll-mt-24`}>
          <h2 id="account-h" className={h2}>Your name</h2>
          <p className="mt-1 mb-4 text-sm text-ink-secondary">
            Signed in as <span className="font-semibold [overflow-wrap:anywhere] text-ink">{user.email}</span>.
          </p>
          <NameForm fullName={user.fullName ?? ""} />
        </section>

        <section aria-labelledby="password-h" id="password" className={`${card} scroll-mt-24`}>
          <h2 id="password-h" className={`${h2} mb-4`}>Password</h2>
          <PasswordForm />
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
        ) : null}

        <section aria-labelledby="delete-h" id="delete" className="scroll-mt-24 rounded-md border border-danger/40 bg-surface p-4 shadow-rest sm:p-6">
          <h2 id="delete-h" className={h2}>Delete my account</h2>
          <p className="mt-1 mb-4 max-w-[62ch] text-sm text-ink-secondary">
            Permanently removes your personal data and signs you out everywhere. You&apos;ll need your current password.
          </p>
          <DeleteAccount email={user.email} isStudent={isStudent} />
        </section>
      </div>
    </div>
  );
}
