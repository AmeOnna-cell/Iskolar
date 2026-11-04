import { redirect } from "next/navigation";

// Kept for the "change what we send you" link in every email: reminders now live in Settings.
export default function NotificationSettingsPage() {
  redirect("/settings#reminders");
}
