import { AuthShell } from "@/components/shell/auth-shell";
import { ForgotForm } from "../forms";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      lead="Enter the email you signed up with. We'll send a link to set a new password."
    >
      <ForgotForm />
    </AuthShell>
  );
}
