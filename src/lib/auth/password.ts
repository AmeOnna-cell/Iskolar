// Password rules, shared by the forms (live checklist) and the server (zod).
// Must match supabase/config.toml: minimum_password_length = 8, lower_upper_letters_digits.

export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "lower", label: "A lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "upper", label: "An uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "digit", label: "A number", test: (p: string) => /\d/.test(p) },
] as const;

export const PASSWORD_MAX = 72; // bcrypt limit used by Supabase Auth

export function passwordProblems(password: string): string[] {
  const missing = PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.label.toLowerCase());
  if (password.length > PASSWORD_MAX) missing.push(`at most ${PASSWORD_MAX} characters`);
  return missing;
}
