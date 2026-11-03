import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const metadata = { title: "Reminder settings" };

// ponytail: the real reminder settings (email, push, on-site, lead days) arrive with Phase 6 (notifications).
export default function NotificationSettingsPage() {
  return (
    <PlaceholderPage title="Reminder settings">
      <p>Choose how and when Iskolar reminds you about deadlines. Settings are coming soon; email reminders are on by default.</p>
    </PlaceholderPage>
  );
}
