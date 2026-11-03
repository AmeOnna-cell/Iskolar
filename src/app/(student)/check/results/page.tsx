import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { Pill } from "@/components/scholarship/bits";
import { ScholarshipCard } from "@/components/scholarship/card";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { requireRole } from "@/lib/auth/session";
import { parseSearchParams, searchScholarships } from "@/lib/data/scholarships";
import { getStudentProfile } from "@/lib/data/student";
import { createClient } from "@/lib/supabase/server";
import { fieldLabel, regionLabel } from "@/lib/reference";
import { ord } from "@/lib/format";

export const metadata = { title: "Your eligibility results" };

const GROUPS = [
  { verdict: "yes", title: "You qualify", tone: "ok" as const },
  { verdict: "maybe", title: "Might qualify, more answers needed", tone: "warn" as const },
  { verdict: "no", title: "Not eligible right now", tone: "danger" as const },
];

export default async function ResultsPage() {
  const user = await requireRole("student");
  const sp = await getStudentProfile(user.id);
  if (!sp) redirect("/check");

  // ponytail: one page of 50 listings, sorted by deadline. Add a verdict filter to the RPC if a
  // student's list grows past that.
  const [{ rows }, apps] = await Promise.all([
    searchScholarships({ ...parseSearchParams({}), pageSize: 50 }, user),
    createClient().then(async (c) => new Map(((await c.from("applications").select("scholarship_id, stage")).data ?? []).map((a) => [a.scholarship_id, a.stage]))),
  ]);
  const basis = [sp.program || (sp.field ? fieldLabel[sp.field] : null), sp.year_level ? `${ord(sp.year_level)} year` : null, sp.gwa ? `GWA ${Number(sp.gwa).toFixed(2)}` : null, sp.region ? regionLabel[sp.region] : null]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="page-container py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Your eligibility results</h1>
          {basis ? <p className="mt-2 text-ink-secondary">Based on {basis}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/check?step=1" variant="outline">
            <Icon name="edit" size={18} /> Edit answers
          </ButtonLink>
          <ButtonLink href="/dashboard">Go to my dashboard</ButtonLink>
        </div>
      </div>
      <div className="mt-6">
        <Notice>
          This is a preliminary check, not an official decision. Providers make the final call and may have requirements we can&apos;t check here.
        </Notice>
      </div>
      {GROUPS.map((g) => {
        const list = rows.filter((r) => r.verdict === g.verdict);
        if (!list.length) return null;
        return (
          <section key={g.verdict} aria-labelledby={`g-${g.verdict}`} className="mt-10">
            <h2 id={`g-${g.verdict}`} className="mb-4 flex items-center gap-2 text-title-sm font-[650] text-ink sm:text-title">
              <Pill tone={g.tone}>{list.length}</Pill>
              {g.title}
            </h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {list.map((s) => (
                <li key={s.id}>
                  <ScholarshipCard s={s} signedIn stage={apps.get(s.id) ?? null} reason />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
