"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { FIELDS, INCOME, REGIONS } from "@/lib/reference";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type StepState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** What the student submitted, so a failed step re-renders with their picks instead of resetting. */
  values?: Record<string, string | boolean | null>;
  /** Changes on every failed attempt, so the form remounts with `values` and focus moves to the first error. */
  attempt?: number;
};

const fieldValues = FIELDS.map(([v]) => v) as [string, ...string[]];
const regionValues = REGIONS.map(([v]) => v) as [string, ...string[]];
const incomeValues = INCOME.map(([v]) => v) as [string, ...string[]];
const opt = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v !== "" ? v : null;
};

const schemas = {
  1: z.object({
    field: z.enum(fieldValues, { error: "Select your course area so we can match course-specific scholarships." }),
    program: z.string().trim().max(120, "Use 120 characters or fewer.").nullable(),
    year_level: z.coerce
      .number({ error: "Select your year level to continue." })
      .int()
      .min(1, "Select your year level to continue.")
      .max(5, "Select your year level to continue."),
  }),
  2: z
    .object({ gwa: z.string().nullable(), gwa_unknown: z.boolean() })
    .transform((v, ctx) => {
      if (v.gwa_unknown) return { gwa: null, gwa_unknown: true };
      const n = Number(v.gwa);
      if (!v.gwa || !(n >= 1 && n <= 5)) {
        ctx.addIssue({ code: "custom", path: ["gwa"], message: v.gwa ? "Enter a GWA between 1.00 and 5.00." : "Enter your GWA, or tick “I don’t know my GWA yet”." });
        return z.NEVER;
      }
      return { gwa: Math.round(n * 100) / 100, gwa_unknown: false };
    }),
  3: z.object({
    income_bracket: z.enum(incomeValues).nullable(),
    four_ps: z.enum(["yes", "no", "unsure"]).nullable(),
    ofw: z.enum(["yes", "no"]).nullable().transform((v) => (v === null ? null : v === "yes")),
  }),
  4: z.object({ region: z.enum(regionValues).nullable() }),
} as const;

/** Saves one wizard step to the student's own row, then goes to the next step (or the results). */
export async function saveStep(step: 1 | 2 | 3 | 4, _prev: StepState, fd: FormData): Promise<StepState> {
  const user = await requireRole("student");
  const raw =
    step === 1
      ? { field: opt(fd, "field"), program: opt(fd, "program"), year_level: opt(fd, "year_level") }
      : step === 2
        ? { gwa: opt(fd, "gwa"), gwa_unknown: fd.get("gwa_unknown") === "on" }
        : step === 3
          ? { income_bracket: opt(fd, "income_bracket"), four_ps: opt(fd, "four_ps"), ofw: opt(fd, "ofw") }
          : { region: opt(fd, "region") };
  const back = fd.get("dir") === "back";
  const parsed = schemas[step].safeParse(raw);
  if (!parsed.success) {
    // Going back never blocks on this step's errors: it just doesn't save them.
    if (back) redirect(`/check?step=${Math.max(1, step - 1)}`);
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
    const n = Object.keys(fieldErrors).length;
    return {
      status: "error",
      message: n === 1 ? "One answer needs attention." : `${n} answers need attention.`,
      fieldErrors,
      values: raw as unknown as Record<string, string | boolean | null>,
      attempt: Date.now(),
    };
  }
  // Values are validated against the same enums as the table, so this row is a valid insert.
  const row = {
    user_id: user.id,
    ...parsed.data,
    ...(step === 3 ? { answered_family: true } : {}),
  } as Database["public"]["Tables"]["student_profiles"]["Insert"];
  const supabase = await createClient();
  const { error } = await supabase.from("student_profiles").upsert(row, { onConflict: "user_id" });
  if (error) return { status: "error", message: "We couldn't save your answers. Try again." };

  revalidatePath("/dashboard");
  revalidatePath("/explore");
  revalidatePath("/s/[slug]", "page");
  redirect(back ? `/check?step=${Math.max(1, step - 1)}` : step < 4 ? `/check?step=${step + 1}` : "/check/results");
}
