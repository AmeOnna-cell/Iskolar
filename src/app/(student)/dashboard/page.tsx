import { PlaceholderPage } from "@/components/shell/placeholder-page";
import { Notice } from "@/components/ui/notice";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const user = await requireRole("student");
  const { password } = await searchParams;
  return (
    <PlaceholderPage title={`Hi${user.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}`}>
      {password === "updated" ? <Notice tone="ok">Your password is updated. Other devices were signed out.</Notice> : null}
      <p data-testid="private-email">Signed in as {user.email}.</p>
    </PlaceholderPage>
  );
}
