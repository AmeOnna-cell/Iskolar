import Link from "next/link";
import { AuthShell } from "@/components/shell/auth-shell";
import { emailOnlySchema } from "@/lib/validation/auth";
import { InboxHelp, ResendForm } from "../forms";

export const metadata = { title: "Check your email" };

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email: raw } = await searchParams;
  const parsed = emailOnlySchema.safeParse({ email: raw ?? "" });
  const email = parsed.success ? parsed.data.email : undefined;
  return (
    <AuthShell title="Check your email">
      <div className="flex flex-col gap-6">
        <p className="text-ink">
          {email ? (
            <>
              We sent a confirmation link to <strong className="[overflow-wrap:anywhere]">{email}</strong>.
            </>
          ) : (
            "We sent you a confirmation link."
          )}{" "}
          Open it to finish creating your account. The link works once and expires in 1 hour.
        </p>
        <InboxHelp subject="Confirm your Iskolar account" />
        <ResendForm email={email} askEmail={!email} startCooling={Boolean(email)} />
        <p className="text-sm text-ink-secondary">
          Wrong address? <Link href="/signup" className="font-semibold">Sign up again</Link>
          {" · "}
          <Link href="/login" className="font-semibold">Sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
