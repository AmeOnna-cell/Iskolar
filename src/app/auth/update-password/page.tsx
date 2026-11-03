import { NewPasswordForm } from "@/app/(auth)/forms";
import { AuthShell } from "@/components/shell/auth-shell";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Set a new password" };

export default async function UpdatePasswordPage() {
  const user = await requireRole();
  return (
    <AuthShell title="Set a new password" lead={<>For {user.email}.</>}>
      <NewPasswordForm />
    </AuthShell>
  );
}
