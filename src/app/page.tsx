import Link from "next/link";

// ponytail: placeholder so the Phase 1 shell renders; the real landing is built in Phase 4 via /impeccable shape.
export default function Home() {
  return (
    <section className="bg-band py-12 text-white sm:py-16">
      <div className="page-container">
        <h1 className="max-w-[22ch] text-headline-sm font-bold tracking-tight sm:text-display">
          Find scholarships for college students in the Philippines
        </h1>
        <p className="mt-4 max-w-[56ch] text-base text-band-text-soft">
          Government, private and school scholarships in one place, with clear requirements and deadline reminders.
        </p>
        <Link
          href="/check"
          className="mt-8 inline-flex h-11 items-center rounded-sm bg-surface px-4 text-sm font-semibold text-ink no-underline hover:bg-surface-hover"
        >
          Check my eligibility
        </Link>
      </div>
    </section>
  );
}
