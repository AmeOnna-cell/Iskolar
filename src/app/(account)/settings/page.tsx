import { PlaceholderPage } from "@/components/shell/placeholder-page";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Account settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const user = await requireRole();
  const { email } = await searchParams;
  return (
    <PlaceholderPage title="Account settings">
      {email === "changed" ? <Notice tone="ok">Your email address is updated.</Notice> : null}
      <p>Signed in as {user.email}.</p>
      <div>
        <ButtonLink href="/auth/update-password" variant="outline">Change password</ButtonLink>
      </div>
    </PlaceholderPage>
  );
}
