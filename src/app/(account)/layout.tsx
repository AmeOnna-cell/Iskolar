import { requireRole } from "@/lib/auth/session";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireRole();
  return children;
}
