import { requireRole } from "@/lib/auth/session";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireRole("coordinator", "admin");
  return children;
}
