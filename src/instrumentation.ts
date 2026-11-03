// Runs once when the Next.js server starts. Fails fast when email is not configured,
// instead of failing later in the middle of a sign-up or a reminder run.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { readEmailEnv } = await import("./lib/email/env.ts");
    readEmailEnv(process.env);
  }
}
