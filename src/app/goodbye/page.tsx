import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Account deleted", robots: { index: false } };

/** Where self-delete lands (profile → deleteMyAccount). Public: the person is already signed out. */
export default function GoodbyePage() {
  return (
    <div className="page-container py-10 sm:py-16">
      <div className="mx-auto flex max-w-[60ch] flex-col gap-4">
        <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Your account is deleted</h1>
        <p className="text-ink-secondary">
          Your eligibility answers, saved scholarships, checklists, alerts and reminder settings are gone, and you&apos;re signed out on every device.
          Questions you sent stay with the scholarship office, labelled &ldquo;Deleted account&rdquo;. <Link href="/privacy">How we handle your data</Link>.
        </p>
        <p className="text-ink-secondary">Good luck with your applications. You can still browse scholarships without an account.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ButtonLink href="/explore" variant="outline">
            Find scholarships
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
