import { z } from "zod";
import { passwordProblems } from "@/lib/auth/password";

const email = z
  .string({ error: "Enter your email address." })
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(320, "That email address is too long.")
  .pipe(z.email({ error: "Enter an email like name@school.edu.ph." }));

const newPassword = z.string({ error: "Choose a password." }).superRefine((value, ctx) => {
  const problems = passwordProblems(value);
  if (problems.length) ctx.addIssue({ code: "custom", message: `Your password needs ${problems.join(", ")}.` });
});

export const signInSchema = z.object({
  email,
  password: z.string({ error: "Enter your password." }).min(1, "Enter your password.").max(200),
  next: z.string().max(512).optional(),
});

// No "type it again" field: the show-password toggle lets people check what they typed.
export const signUpSchema = z.object({
  fullName: z
    .string({ error: "Enter your name." })
    .trim()
    .min(1, "Enter your name.")
    .max(120, "Use 120 characters or fewer."),
  email,
  password: newPassword,
});

export const emailOnlySchema = z.object({ email });

export const newPasswordSchema = z.object({ password: newPassword });

/** Form state returned by auth server actions. */
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
  /** Echo of non-secret fields so the form keeps them after a failed submit. */
  values?: Record<string, string>;
  /** Extra hint for the UI, e.g. "unconfirmed" or "deactivated". */
  code?: string;
};

export const idle: FormState = { status: "idle" };

export function fieldErrorsOf(error: z.ZodError): Partial<Record<string, string>> {
  const out: Partial<Record<string, string>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
