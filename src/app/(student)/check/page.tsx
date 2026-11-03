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
          <div className="mb-6">
            <Notice tone="ok">Your email is confirmed{first ? `, ${first}` : ""}. Welcome to Iskolar.</Notice>
          </div>
        ) : null}
        <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Eligibility check</h1>
        <p className="mt-2 mb-6 text-ink-secondary">4 short steps. Skip anything you&apos;re not sure about.</p>
        <Wizard
          key={step}
          step={step}
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
