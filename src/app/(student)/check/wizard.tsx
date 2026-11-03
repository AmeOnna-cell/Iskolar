"use client";

import { useActionState, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { FIELDS, INCOME, REGIONS } from "@/lib/reference";
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

function Choice({ name, value, label, checked, required }: { name: string; value: string; label: string; checked: boolean; required?: boolean }) {
  return (
    <label className="relative">
      <input type="radio" name={name} value={value} defaultChecked={checked} required={required} className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0" />
      <span className="flex min-h-11 items-center rounded-sm border border-hairline-strong bg-surface px-4 text-base peer-checked:border-primary peer-checked:bg-primary-wash peer-checked:font-semibold peer-checked:text-primary peer-checked:ring-1 peer-checked:ring-primary peer-checked:ring-inset peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-hover:bg-surface-hover peer-checked:peer-hover:bg-primary-wash">
        {label}
      </span>
    </label>
  );
}

function Question({ legend, hint, error, children, id }: { legend: string; hint?: string; error?: string; children: React.ReactNode; id: string }) {
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={[hint ? `${id}-hint` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined}>
      <legend className="mb-2 text-base font-semibold text-ink">{legend}</legend>
      {hint ? <p id={`${id}-hint`} className="-mt-1 text-caption text-ink-hint">{hint}</p> : null}
      {children}
      {error ? <p id={`${id}-err`} className="text-caption font-semibold text-danger">{error}</p> : null}
    </fieldset>
  );
}

export function Wizard({ step, answers }: { step: 1 | 2 | 3 | 4; answers: Answers }) {
  const [state, action, pending] = useActionState<StepState, FormData>(saveStep.bind(null, step), { status: "idle" });
  const [gwaUnknown, setGwaUnknown] = useState(answers.gwa_unknown);
  const e = state.fieldErrors ?? {};

  return (
    <>
      <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i + 1 === step ? "step" : undefined}
            className={`border-t-[3px] pt-2 text-caption font-semibold ${i + 1 <= step ? "border-primary text-ink" : "border-hairline text-ink-hint"}`}
          >
            Step {i + 1}
            <span className="max-sm:sr-only"> of 4: {label}</span>
          </li>
        ))}
      </ol>
      <form action={action} noValidate className="flex flex-col gap-8 rounded-md border border-hairline bg-surface p-5 shadow-rest sm:p-8">
        {step === 1 ? (
          <>
            <div>
              <h2 className="text-title font-[650] text-ink">Your studies</h2>
              <p className="mt-1 text-ink-secondary">Some scholarships are only for certain courses or year levels.</p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="w-field" className="text-base font-semibold text-ink">Course area</label>
              <select id="w-field" name="field" defaultValue={answers.field ?? ""} aria-invalid={e.field ? true : undefined} aria-describedby={e.field ? "w-field-err" : undefined} className={`${inputClass} max-w-[420px] ${e.field ? "border-danger" : "border-hairline-strong"}`}>
                <option value="">Select your course area</option>
                {FIELDS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {e.field ? <p id="w-field-err" className="text-caption font-semibold text-danger">{e.field}</p> : null}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="w-program" className="text-base font-semibold text-ink">
                Program <span className="font-normal text-ink-hint">(optional)</span>
              </label>
              <input id="w-program" name="program" maxLength={120} placeholder="e.g. BS Biology" defaultValue={answers.program ?? ""} className={`${inputClass} max-w-[420px] border-hairline-strong`} />
            </div>
            <Question legend="Year level" error={e.year_level} id="w-year">
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((y) => (
                  <Choice key={y} name="year_level" value={String(y)} label={`${y}${["th", "st", "nd", "rd"][y] ?? "th"} year`} checked={answers.year_level === y} />
                ))}
              </div>
            </Question>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div>
              <h2 className="text-title font-[650] text-ink">Your grades</h2>
              <p className="mt-1 text-ink-secondary">Many scholarships require a minimum general weighted average (GWA).</p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="w-gwa" className="text-base font-semibold text-ink">GWA last semester</label>
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
                defaultValue={answers.gwa ?? ""}
                disabled={gwaUnknown}
                aria-invalid={e.gwa ? true : undefined}
                aria-describedby={`w-gwa-hint${e.gwa ? " w-gwa-err" : ""}`}
                className={`${inputClass} max-w-[200px] ${e.gwa ? "border-danger" : "border-hairline-strong"}`}
              />
              {e.gwa ? <p id="w-gwa-err" className="text-caption font-semibold text-danger">{e.gwa}</p> : null}
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
              <input type="checkbox" name="gwa_unknown" defaultChecked={answers.gwa_unknown} onChange={(ev) => setGwaUnknown(ev.target.checked)} className="size-[18px] accent-[var(--primary)]" />
              I don&apos;t know my GWA yet
            </label>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <div>
              <h2 className="text-title font-[650] text-ink">Your family</h2>
              <p className="mt-1 text-ink-secondary">
                Government scholarships often depend on household income. Only you can see these answers.
              </p>
            </div>
            <Question legend="Combined yearly household income" hint="Add up the yearly income of everyone who supports you. An estimate is fine." id="w-income">
              <div className="flex max-w-[420px] flex-col gap-2">
                {INCOME.map(([v, l]) => (
                  <Choice key={v} name="income_bracket" value={v} label={l} checked={answers.income_bracket === v} />
                ))}
                <Choice name="income_bracket" value="" label="I’m not sure" checked={answers.answered_family && answers.income_bracket === null} />
              </div>
            </Question>
            <Question legend="Is your household in 4Ps or the DSWD Listahanan?" id="w-4ps">
              <div className="flex flex-wrap gap-2">
                <Choice name="four_ps" value="yes" label="Yes" checked={answers.four_ps === "yes"} />
                <Choice name="four_ps" value="no" label="No" checked={answers.four_ps === "no"} />
                <Choice name="four_ps" value="unsure" label="Not sure" checked={answers.four_ps === "unsure"} />
              </div>
            </Question>
            <Question legend="Is one of your parents an OFW?" id="w-ofw">
              <div className="flex flex-wrap gap-2">
                <Choice name="ofw" value="yes" label="Yes" checked={answers.ofw === true} />
                <Choice name="ofw" value="no" label="No" checked={answers.ofw === false} />
              </div>
            </Question>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <div>
              <h2 className="text-title font-[650] text-ink">Where you live</h2>
              <p className="mt-1 text-ink-secondary">Local government and some private scholarships are only for certain regions.</p>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="w-region" className="text-base font-semibold text-ink">Home region</label>
              <select id="w-region" name="region" defaultValue={answers.region ?? ""} className={`${inputClass} max-w-[420px] border-hairline-strong`}>
                <option value="">Select your region</option>
                {REGIONS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </>
        ) : null}

        {state.status === "error" && state.message && !Object.keys(e).length ? <Notice tone="danger" live>{state.message}</Notice> : null}
        <div className="flex items-center justify-between gap-3 border-t border-hairline pt-6">
          {step > 1 ? (
            <ButtonLink href={`/check?step=${step - 1}`} variant="outline">Back</ButtonLink>
          ) : (
            <span />
          )}
          <Button type="submit" loading={pending}>{step < 4 ? "Next" : "See my results"}</Button>
        </div>
      </form>
    </>
  );
}
