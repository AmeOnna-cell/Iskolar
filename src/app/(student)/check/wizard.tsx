"use client";

import { Combobox } from "@/components/ui/combobox";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { FIELD_OPTIONS, INCOME, REGION_OPTIONS } from "@/lib/reference";
import { saveStep, type StepState } from "./actions";

export type Answers = {
  field: string | null;
  program: string | null;
  year_level: number | null;
  gwa: number | null;
  gwa_unknown: boolean;
  income_bracket: string | null;
  four_ps: string | null;
  ofw: boolean | null;
  region: string | null;
  answered_family: boolean;
};

const STEPS = ["Studies", "Grades", "Family", "Location"] as const;

function Choice({ name, value, label, checked }: { name: string; value: string; label: string; checked: boolean }) {
  return (
    <label className="relative">
      <input type="radio" name={name} value={value} defaultChecked={checked} className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0" />
      <span className="flex min-h-11 items-center rounded-sm border border-hairline-strong bg-surface px-4 text-base peer-checked:border-primary peer-checked:bg-primary-wash peer-checked:font-semibold peer-checked:text-primary peer-checked:ring-1 peer-checked:ring-primary peer-checked:ring-inset peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-hover:bg-surface-hover peer-checked:peer-hover:bg-primary-wash">
        {label}
      </span>
    </label>
  );
}

function Question({ legend, hint, error, children, id }: { legend: string; hint?: string; error?: string; children: React.ReactNode; id: string }) {
  return (
    <fieldset className="flex flex-col gap-2" data-invalid={error ? true : undefined} aria-describedby={[hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined}>
      <legend className="mb-1 text-sm font-semibold text-ink">{legend}</legend>
      {hint ? <p id={`${id}-hint`} className="-mt-1 text-caption text-ink-hint">{hint}</p> : null}
      {children}
      {error ? <p id={`${id}-err`} className="text-caption font-semibold text-danger">{error}</p> : null}
    </fieldset>
  );
}

export function Wizard({ step, answers, hasAnswers }: { step: 1 | 2 | 3 | 4; answers: Answers; hasAnswers: boolean }) {
  const [state, action, pending] = useActionState<StepState, FormData>(saveStep.bind(null, step), { status: "idle" });
  const e = state.fieldErrors ?? {};
  // After a failed attempt, show what the student picked (not the saved answers).
  const v = state.values ?? {};
  const pick = <T,>(key: string, saved: T): T | string | boolean | null => (key in v ? (v[key] as string | boolean | null) : saved);
  const a = {
    field: pick("field", answers.field),
    program: pick("program", answers.program),
    year_level: pick("year_level", answers.year_level === null ? null : String(answers.year_level)),
    gwa: pick("gwa", answers.gwa === null ? null : String(answers.gwa)),
    gwa_unknown: pick("gwa_unknown", answers.gwa_unknown) === true,
    income_bracket: pick("income_bracket", answers.income_bracket),
    four_ps: pick("four_ps", answers.four_ps),
    ofw: pick("ofw", answers.ofw === null ? null : answers.ofw ? "yes" : "no"),
    region: pick("region", answers.region),
  };
  const [gwaUnknown, setGwaUnknown] = useState(a.gwa_unknown);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.attempt) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid] input')?.focus();
  }, [state.attempt]);

  return (
    <>
      <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Progress">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const cls = `block border-t-[3px] pt-2 text-caption font-semibold ${n <= step ? "border-primary text-ink" : "border-hairline text-ink-hint"}`;
          const text = (
            <>
              <span className="sr-only">Step {n} of 4: </span>
              {label}
            </>
          );
          return (
            <li key={label} aria-current={n === step ? "step" : undefined}>
              {/* Steps already reached (or answered before) can be opened directly to change one answer. */}
              {n !== step && (n < step || hasAnswers) ? (
                <Link href={`/check?step=${n}`} className={`${cls} min-h-11 no-underline hover:text-primary`}>
                  {text}
                </Link>
              ) : (
                <span className={`${cls} min-h-11`}>{text}</span>
              )}
            </li>
          );
        })}
      </ol>
      <form ref={formRef} key={state.attempt ?? 0} action={action} noValidate className="flex flex-col gap-6 rounded-md border border-hairline bg-surface p-4 shadow-rest sm:p-6">
        {step === 1 ? (
          <>
            <div>
              <h2 className="text-title-sm font-[650] text-ink sm:text-title">Your studies</h2>
              <p className="mt-1 text-ink-secondary">Some scholarships are only for certain courses or year levels.</p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="w-field" className="text-sm font-semibold text-ink">Course area <span className="font-normal text-ink-hint">(needed)</span></label>
              <div className="max-w-[420px]">
                <Combobox id="w-field" name="field" options={FIELD_OPTIONS} emptyLabel="Select your course area" defaultValue={(a.field as string | null) ?? ""} aria-invalid={Boolean(e.field)} aria-describedby={e.field ? "w-field-err" : undefined} className={`${inputClass} ${e.field ? "border-danger" : "border-hairline-strong"}`} />
              </div>
              {e.field ? <p id="w-field-err" className="text-caption font-semibold text-danger">{e.field}</p> : null}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="w-program" className="text-sm font-semibold text-ink">
                Program <span className="font-normal text-ink-hint">(optional)</span>
              </label>
              <input id="w-program" name="program" maxLength={120} placeholder="e.g. BS Biology" defaultValue={(a.program as string | null) ?? ""} className={`${inputClass} max-w-[420px] border-hairline-strong`} />
            </div>
            <Question legend="Year level (needed)" error={e.year_level} id="w-year">
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((y) => (
                  <Choice key={y} name="year_level" value={String(y)} label={`${y}${["th", "st", "nd", "rd"][y] ?? "th"} year`} checked={a.year_level === String(y)} />
                ))}
              </div>
            </Question>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div>
              <h2 className="text-title-sm font-[650] text-ink sm:text-title">Your grades</h2>
              <p className="mt-1 text-ink-secondary">Many scholarships require a minimum general weighted average (GWA).</p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="w-gwa" className="text-sm font-semibold text-ink">GWA last semester</label>
              <p id="w-gwa-hint" className="-mt-1 text-caption text-ink-hint">
                Most schools use 1.00 as the highest grade. If yours uses percentages, ask the registrar for the equivalent.
              </p>
              <input
                id="w-gwa"
                name="gwa"
                type="number"
                inputMode="decimal"
                min={1}
                max={5}
                step={0.01}
                placeholder="e.g. 1.85"
                defaultValue={(a.gwa as string | null) ?? ""}
                disabled={gwaUnknown}
                aria-invalid={e.gwa ? true : undefined}
                aria-describedby={`w-gwa-hint${e.gwa ? " w-gwa-err" : ""}`}
                className={`${inputClass} max-w-[200px] ${e.gwa ? "border-danger" : "border-hairline-strong"}`}
              />
              {e.gwa ? <p id="w-gwa-err" className="text-caption font-semibold text-danger">{e.gwa}</p> : null}
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
              <input type="checkbox" name="gwa_unknown" defaultChecked={a.gwa_unknown} onChange={(ev) => setGwaUnknown(ev.target.checked)} className="size-[18px] accent-[var(--primary)]" />
              I don&apos;t know my GWA yet
            </label>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div>
              <h2 className="text-title-sm font-[650] text-ink sm:text-title">Your family</h2>
              <p className="mt-1 text-ink-secondary">
                Government scholarships often depend on household income. Only you can see these answers.
              </p>
            </div>
            <Question legend="Combined yearly household income" hint="Add up the yearly income of everyone who supports you. An estimate is fine." id="w-income">
              <div className="flex max-w-[420px] flex-col gap-2">
                {INCOME.map(([v, l]) => (
                  <Choice key={v} name="income_bracket" value={v} label={l} checked={a.income_bracket === v} />
                ))}
                <Choice name="income_bracket" value="" label="I’m not sure" checked={"income_bracket" in v ? v.income_bracket === null : answers.answered_family && answers.income_bracket === null} />
              </div>
            </Question>
            <Question
              legend="Is your household in 4Ps or the DSWD Listahanan?"
              hint="4Ps is the Pantawid Pamilyang Pilipino Program. Your barangay or the DSWD office can confirm it."
              id="w-4ps"
            >
              <div className="flex flex-wrap gap-2">
                <Choice name="four_ps" value="yes" label="Yes" checked={a.four_ps === "yes"} />
                <Choice name="four_ps" value="no" label="No" checked={a.four_ps === "no"} />
                <Choice name="four_ps" value="unsure" label="Not sure" checked={a.four_ps === "unsure"} />
              </div>
            </Question>
            <Question legend="Is one of your parents an OFW?" hint="An overseas Filipino worker, working abroad now." id="w-ofw">
              <div className="flex flex-wrap gap-2">
                <Choice name="ofw" value="yes" label="Yes" checked={a.ofw === "yes"} />
                <Choice name="ofw" value="no" label="No" checked={a.ofw === "no"} />
              </div>
            </Question>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <div>
              <h2 className="text-title-sm font-[650] text-ink sm:text-title">Where you live</h2>
              <p className="mt-1 text-ink-secondary">Local government and some private scholarships are only for certain regions.</p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="w-region" className="text-sm font-semibold text-ink">Home region</label>
              <div className="max-w-[420px]">
                <Combobox id="w-region" name="region" options={REGION_OPTIONS} emptyLabel="Select your region" defaultValue={(a.region as string | null) ?? ""} className={`${inputClass} border-hairline-strong`} />
              </div>
            </div>
          </>
        ) : null}

        {state.status === "error" && state.message ? <Notice tone="danger" live>{state.message}</Notice> : null}
        <div className="flex items-center justify-between gap-3 border-t border-hairline pt-6">
          {step > 1 ? (
            // Saves this step's valid answers, then goes back (never blocked by this step's errors).
            <Button type="submit" name="dir" value="back" variant="outline" disabled={pending}>
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" loading={pending}>{step < 4 ? "Next" : "See my results"}</Button>
        </div>
      </form>
    </>
  );
}
