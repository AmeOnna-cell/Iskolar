import { requireRole } from "@/lib/auth/session";

// Layer 2 behind middleware: every student page re-checks the account with Auth and the database.
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireRole("student");
  return children;
}
