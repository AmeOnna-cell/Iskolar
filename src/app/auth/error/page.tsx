import Link from "next/link";
import { ResendForm } from "@/app/(auth)/forms";
import { AuthShell } from "@/components/shell/auth-shell";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Link not valid" };

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string; type?: string }> }) {
  const { reason, type } = await searchParams;
  const expired = reason === "expired";
  const title = expired ? "This link has expired or was already used" : "This link doesn't work";

  if (type === "recovery") {
    return (
      <AuthShell title={title}>
        <div className="flex flex-col gap-6">
          <p className="text-ink">
            Password reset links work once and expire after 1 hour. Request a new one and use the latest email.
          </p>
          <ButtonLink href="/forgot-password">Request a new reset link</ButtonLink>
        </div>
      </AuthShell>
    );
  }

  if (type === "email_change") {
    return (
      <AuthShell title={title}>
        <div className="flex flex-col gap-6">
          <p className="text-ink">
            Email change links work once and expire after 1 hour. Sign in and change your email again to get a new link.
          </p>
          <ButtonLink href="/login?next=/profile">Sign in</ButtonLink>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={title}>
      <div className="flex flex-col gap-6">
        <p className="text-ink">
          Confirmation links work once and expire after 1 hour.{" "}
          <strong>If you already confirmed your email, you can sign in.</strong> Otherwise, send yourself a new link.
        </p>
        <ButtonLink href="/login">Sign in</ButtonLink>
        <div className="border-t border-hairline pt-6">
          <h2 className="mb-4 text-base font-semibold text-ink">Send a new confirmation link</h2>
          <ResendForm askEmail />
        </div>
        <p className="text-sm text-ink-secondary">
          Still stuck? <Link href="/help" className="font-semibold">Help and FAQ</Link>
        </p>
      </div>
    </AuthShell>
  );
}
