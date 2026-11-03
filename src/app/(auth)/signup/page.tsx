import { AuthShell } from "@/components/shell/auth-shell";
import { SignupForm } from "../forms";

export const metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      lead="Free for every college student. Next, a few questions about your studies show what you qualify for."
    >
      <SignupForm />
    </AuthShell>
  );
}
