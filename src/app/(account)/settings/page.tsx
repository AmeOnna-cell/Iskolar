import { redirect } from "next/navigation";

// Settings became My profile. The browser keeps the #fragment across the redirect, so
// /settings#reminders and /settings#answers land on the same sections.
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  redirect(email === "changed" ? "/profile?email=changed" : "/profile");
}
