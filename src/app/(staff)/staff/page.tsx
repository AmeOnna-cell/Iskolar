import { PlaceholderPage } from "@/components/shell/placeholder-page";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Scholarship office" };

export default async function StaffHomePage() {
  const user = await requireRole("coordinator", "admin");
  return (
    <PlaceholderPage title="Scholarship office">
      <p data-testid="private-email">Signed in as {user.email} ({user.role}).</p>
    </PlaceholderPage>
  );
}
