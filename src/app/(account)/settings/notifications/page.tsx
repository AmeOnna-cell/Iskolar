import { redirect } from "next/navigation";

// The "change what we send you" link in every email (PREFERENCES_PATH): reminders live in My profile.
export default function NotificationSettingsPage() {
  redirect("/profile#reminders");
}
