import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { Pill } from "@/components/scholarship/bits";
import { ScholarshipCard } from "@/components/scholarship/card";
import { ButtonLink } from "@/components/ui/button";
import { cookies } from "next/headers";
import { NEXT_COOKIE, destinationOf } from "@/lib/auth/routes";
import { requireRole } from "@/lib/auth/session";
import { parseSearchParams, searchScholarships } from "@/lib/data/scholarships";
import { getStudentProfile } from "@/lib/data/student";
import { requirementLabel, stepFor, type EligibilityItem } from "@/lib/eligibility";
import { dueText, ord, plural } from "@/lib/format";
import { fieldLabel, incomeLabel, regionLabel } from "@/lib/reference";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Your eligibility results" };

export default async function ResultsPage() {
  const user = await requireRole("student");
  const sp = await getStudentProfile(user.id);
  // A new account that signed up on the way somewhere: offer to go there now.
  const headed = destinationOf((await cookies()).get(NEXT_COOKIE)?.value);
  if (!sp) redirect("/check");

  // ponytail: one page of 50 listings, sorted by deadline. Add a verdict filter to the RPC if a
  // student's list grows past that.
  const [{ rows: all }, apps] = await Promise.all([
    searchScholarships({ ...parseSearchParams({}), pageSize: 50 }, user),
    createClient().then(async (c) => new Map(((await c.from("applications").select("scholarship_id, stage")).data ?? []).map((a) => [a.scholarship_id, a.stage]))),
  ]);
  // Closed listings can't be applied to, whatever the verdict.
  const rows = all.filter((r) => r.status !== "closed");
  const yes = rows.filter((r) => r.verdict === "yes");
  const maybe = rows.filter((r) => r.verdict === "maybe");
  const no = rows.filter((r) => r.verdict === "no");

  // Everything the verdicts used, family answers included.
  const basis = [
    sp.program || (sp.field ? fieldLabel[sp.field] : null),
    sp.year_level ? `${ord(sp.year_level)} year` : null,
    sp.gwa ? `GWA ${Number(sp.gwa).toFixed(2)}` : null,
    sp.income_bracket ? `household income ${incomeLabel[sp.income_bracket]}` : null,
    sp.four_ps === "yes" ? "in 4Ps or Listahanan" : null,
    sp.ofw ? "OFW parent" : null,
    sp.region ? regionLabel[sp.region] : null,
  ].filter(Boolean);

  const first = yes[0];
  const lead = yes.length
    ? `You qualify for ${plural(yes.length, "scholarship")}.${first?.status === "open" ? ` ${first.name} ${dueText(first).toLowerCase()}.` : ""}`
    : maybe.length
      ? `You might qualify for ${plural(maybe.length, "scholarship")}. A few more answers will settle it.`
      : "Nothing open matches your answers yet. We'll alert you when a new scholarship does.";

  // One "Answer now" per missing question, naming the listings it would settle.
  const gaps = new Map<string, { label: string; step: number; names: string[] }>();
  for (const r of maybe) {
    const gap = r.first_gap as EligibilityItem | null;
    if (!gap || gap.status !== "unknown") continue;
    const g = gaps.get(gap.kind) ?? { label: requirementLabel(gap), step: stepFor(gap), names: [] };
    g.names.push(r.name);
    gaps.set(gap.kind, g);
  }

  const card = (s: (typeof rows)[number]) => (
    <li key={s.id}>
      <ScholarshipCard s={s} signedIn stage={apps.get(s.id) ?? null} reason />
    </li>
  );

  return (
    <div className="page-container py-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[70ch]">
          <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Your eligibility results</h1>
          <p className="mt-2 text-base text-ink sm:text-title-sm sm:leading-normal" data-testid="results-lead">
            {lead}
          </p>
          {basis.length ? <p className="mt-2 text-sm text-ink-secondary">Based on: {basis.join(", ")}.</p> : null}
          <p className="mt-1 text-caption text-ink-hint">
            This is a preliminary check, not an official decision. Providers make the final call and may have requirements we can&apos;t check here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/check?step=1" variant="outline">
            <Icon name="edit" size={18} /> Edit answers
          </ButtonLink>
          {headed ? (
            <ButtonLink href="/continue">Continue to {headed.name}</ButtonLink>
          ) : (
            <ButtonLink href="/dashboard" variant="text">
              Go to my dashboard
            </ButtonLink>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-md border border-hairline bg-surface px-6 py-12 text-center shadow-rest">
          <p className="font-semibold text-ink">No open scholarships to check yet</p>
          <p className="mt-1 text-sm text-ink-secondary">We&apos;ll alert you when a new one matches your answers.</p>
          <Link href="/explore" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold">Find scholarships</Link>
        </div>
      ) : null}

      {yes.length ? (
        <section aria-labelledby="g-yes" className="mt-8">
          <h2 id="g-yes" className="mb-4 flex items-center gap-2 text-title-sm font-[650] text-ink sm:text-title">
            <Pill tone="ok">{yes.length}</Pill>
            You qualify
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">{yes.map(card)}</ul>
        </section>
      ) : null}

      {maybe.length ? (
        <section aria-labelledby="g-maybe" className="mt-8">
          <h2 id="g-maybe" className="mb-4 flex items-center gap-2 text-title-sm font-[650] text-ink sm:text-title">
            <Pill tone="warn">{maybe.length}</Pill>
            Might qualify, more answers needed
          </h2>
          {gaps.size ? (
            <ul className="mb-4 overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
              {[...gaps.values()].map((g) => (
                <li key={g.label} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-hairline px-4 py-3 first:border-t-0 sm:px-6">
                  <span className="min-w-0 text-sm text-ink">
                    <span className="font-semibold">{g.label}?</span>{" "}
                    <span className="text-ink-secondary">Answering settles {g.names.join(", ")}.</span>
                  </span>
                  <ButtonLink href={`/check?step=${g.step}`} variant="outline" size="sm">
                    Answer now
                  </ButtonLink>
                </li>
              ))}
            </ul>
          ) : null}
          <ul className="grid gap-3 md:grid-cols-2">{maybe.map(card)}</ul>
        </section>
      ) : null}

      {no.length ? (
        <details className="group mt-8" data-testid="not-eligible">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-title-sm font-[650] text-ink sm:text-title [&::-webkit-details-marker]:hidden">
            <Pill tone="danger">{no.length}</Pill>
            Not eligible right now
            <span className="text-sm font-semibold text-primary group-open:hidden">See why</span>
          </summary>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">{no.map(card)}</ul>
        </details>
      ) : null}
    </div>
  );
}
