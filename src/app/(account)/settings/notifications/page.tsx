import Link from "next/link";
import { PreferencesForm } from "@/components/notifications/preferences-form";
import { requireRole } from "@/lib/auth/session";
import { getPreferences } from "@/lib/data/notifications";

export const metadata = { title: "Reminder settings" };

// Every Iskolar email links here ("Change what we send you").
export default async function NotificationSettingsPage() {
  const user = await requireRole();
  return (
    <div className="page-container py-8">
      <div className="reading-column">
        <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Reminder settings</h1>
        {user.role === "student" ? (
          <>
            <p className="mt-2 mb-6 text-ink-secondary">Choose how and when Iskolar reminds you. Turning everything off still keeps your alerts history.</p>
            <div className="rounded-md border border-hairline bg-surface p-5 shadow-rest">
              <PreferencesForm prefs={await getPreferences()} email={user.email} />
            </div>
            <p className="mt-4 text-sm">
              <Link href="/alerts">See your alerts</Link>
            </p>
          </>
        ) : (
          <p className="mt-2 text-ink-secondary">Reminders are for student accounts. Staff accounts don&apos;t get deadline alerts.</p>
        )}
      </div>
    </div>
  );
}
