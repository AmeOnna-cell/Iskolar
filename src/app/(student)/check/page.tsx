import { Notice } from "@/components/ui/notice";
import { requireRole } from "@/lib/auth/session";
import { getStudentProfile } from "@/lib/data/student";
import { Wizard } from "./wizard";

export const metadata = { title: "Eligibility check" };

export default async function CheckPage({ searchParams }: { searchParams: Promise<{ step?: string; welcome?: string }> }) {
  const user = await requireRole("student");
  const { step: rawStep, welcome } = await searchParams;
  const step = ([1, 2, 3, 4] as const).find((n) => String(n) === rawStep) ?? 1;
  const sp = await getStudentProfile(user.id);
  const first = user.fullName?.trim().split(/\s+/)[0];

  return (
    <div className="page-container py-6 sm:py-8">
      <div className="mx-auto w-full max-w-[720px]">
        {welcome ? (
          <div className="mb-4 sm:mb-6">
            <Notice tone="ok">Your email is confirmed{first ? `, ${first}` : ""}. Welcome to Iskolar.</Notice>
          </div>
        ) : null}
        {/* Phones: the page heading is a small label with the step count, so the step title is the one
            larger line; the intro shows on step 1 only. From 640px both are as before. */}
        <h1 className={`text-sm font-semibold text-ink-secondary sm:text-headline sm:font-bold sm:tracking-tight sm:text-ink ${step > 1 ? "max-sm:mb-4" : ""}`}>
          Eligibility check
          <span className="sm:hidden" aria-hidden="true"> · Step {step} of 4</span>
        </h1>
        <p className={`mt-1 mb-4 text-sm text-ink-secondary sm:mt-2 sm:mb-6 sm:block sm:text-base ${step > 1 ? "hidden" : ""}`}>4 short steps. Only your course area and year level are needed; skip anything else you&apos;re not sure about.</p>
        <Wizard
          key={step}
          step={step}
          hasAnswers={Boolean(sp)}
          answers={{
            field: sp?.field ?? null,
            program: sp?.program ?? null,
            year_level: sp?.year_level ?? null,
            gwa: sp?.gwa ?? null,
            gwa_unknown: sp?.gwa_unknown ?? false,
            income_bracket: sp?.income_bracket ?? null,
            four_ps: sp?.four_ps ?? null,
            ofw: sp?.ofw ?? null,
            region: sp?.region ?? null,
            answered_family: sp?.answered_family ?? false,
          }}
        />
      </div>
    </div>
  );
}
