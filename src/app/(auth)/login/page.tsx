import { AuthShell } from "@/components/shell/auth-shell";
import { Notice } from "@/components/ui/notice";
import { destinationOf } from "@/lib/auth/routes";
import { LoginForm } from "../forms";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const notice =
    sp.error === "deactivated" ? (
      <Notice tone="danger">
        This account has been deactivated. Contact the scholarship office if you think this is a mistake.
      </Notice>
    ) : sp.signedOut ? (
      <Notice tone="ok">You&apos;re signed out.</Notice>
    ) : sp.next ? (
      <Notice>{destinationOf(sp.next) ? `Sign in or create an account to ${destinationOf(sp.next)!.purpose}.` : "Sign in to continue."}</Notice>
    ) : null;
  return (
    <AuthShell title="Sign in" lead="Use the email and password you signed up with.">
      <LoginForm next={sp.next} notice={notice} />
    </AuthShell>
  );
}
