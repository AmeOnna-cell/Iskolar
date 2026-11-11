import { Combobox, type ComboOption } from "@/components/ui/combobox";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { ProviderMark } from "@/components/scholarship/bits";
import { ScholarshipCard } from "@/components/scholarship/card";
import { RequirementRows } from "@/components/scholarship/criteria";
import { buttonClass } from "@/components/ui/button";
import { getListingStats, getProvidersWithListings, getScholarshipOptions, parseSearchParams, searchScholarships } from "@/lib/data/scholarships";
import type { EligibilityItem } from "@/lib/eligibility";
import { plural, shortProvider } from "@/lib/format";
import { FIELD_OPTIONS, PROVIDER_TYPES } from "@/lib/reference";

// What the eligibility check looks like, with made-up answers (shown as an example, never as a result).
const EXAMPLE: EligibilityItem[] = [
  { kind: "gwa", status: "met", required: 2.5, have: 1.85 },
  { kind: "income", status: "met", required: 400000, have: "150k_250k", answered: true },
  { kind: "four_ps", status: "unknown", required: true, have: null },
];

// Signed-in visitors are redirected to their home by middleware, so this page is the public front door.
export default async function LandingPage() {
  const [stats, closing, providers, scholarships] = await Promise.all([
    getListingStats(),
    searchScholarships(parseSearchParams({ status: "open", sort: "deadline" }), null),
    getProvidersWithListings(),
    getScholarshipOptions(),
  ]);

  const searchOptions: ComboOption[] = [
    ...new Set(scholarships.map(({ name }) => name).filter((name) => name.length <= 100)),
  ].map((name) => [name, name]);
  const knownQueries = new Set(searchOptions.map(([query]) => query));
  for (const provider of providers) {
    const query = provider.abbr || provider.name;
    if (query.length > 100 || knownQueries.has(query)) continue;
    searchOptions.push([query, provider.short_name ?? provider.name, `${provider.abbr} ${provider.name}`]);
    knownQueries.add(query);
  }

  return (
    <>
      <section className="bg-band py-8 text-white sm:py-12">
        <div className="page-container">
          <h1 className="max-w-[22ch] text-headline-sm font-bold tracking-tight sm:text-display">
            Find scholarships for college students in the Philippines
          </h1>
          <p className="mt-4 max-w-[56ch] text-base text-band-text-soft sm:text-title sm:leading-normal">
            Government, private and school scholarships in one place, with clear requirements and deadline reminders.
          </p>
          <form action="/explore" role="search" className="mt-7 grid w-full gap-2 rounded-lg bg-surface p-2 text-ink sm:grid-cols-[minmax(0,1fr)_minmax(9rem,0.45fr)_auto]">
            <div className="min-w-0">
              <label htmlFor="hero-search" className="sr-only">Scholarship or provider</label>
              <div className="relative">
                <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-ink-hint" />
                <Combobox id="hero-search" name="q" options={searchOptions} placeholder="Search by name or keyword" allowFreeText maxLength={100} className="h-11 w-full rounded-sm border border-hairline-strong bg-surface pl-9 text-base text-ink placeholder:text-ink-hint focus:outline-2 focus:outline-primary" />
              </div>
            </div>
            <div className="min-w-0">
              <label htmlFor="hero-field" className="sr-only">Course area</label>
              <Combobox id="hero-field" name="field" options={FIELD_OPTIONS} emptyLabel="Any course" className="h-11 w-full rounded-sm border border-hairline-strong bg-surface pl-3 text-base text-ink placeholder:text-ink focus:outline-2 focus:outline-primary" />
            </div>
            <button type="submit" className={buttonClass("primary", "md", "h-11 px-4 md:px-6")}>
              Find scholarships
            </button>
          </form>
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-band-text-soft">
            Popular searches:
            {["TES", "DOST", "OWWA", "CHED"].map((k) => (
              <Link key={k} href={`/explore?q=${k}`} className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-3 text-sm text-white no-underline hover:bg-white/10 nav:min-h-9">
                {k}
              </Link>
            ))}
          </p>
          <dl className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/20 pt-4">
            {[
              [String(stats.open), "open now"],
              [String(stats.upcoming), "opening soon"],
              // Sample listings are never counted as verified.
              ...(stats.total > stats.sample ? [[`${stats.verified} of ${stats.total - stats.sample}`, "verified with official sources"]] : []),
              ...(stats.sample ? [[String(stats.sample), stats.sample === 1 ? "sample listing" : "sample listings"]] : []),
            ].map(([value, label]) => (
              <div key={label} className="flex flex-row-reverse items-baseline gap-2">
                <dt className="text-sm text-band-text-soft">{label}</dt>
                <dd className="tnum text-title-sm font-bold text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="page-container flex flex-col gap-12 py-8 sm:py-12">
        <section aria-labelledby="check-h" className="grid items-center gap-6 rounded-lg border border-hairline bg-surface p-5 shadow-rest sm:p-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10">
          <div>
            <h2 id="check-h" className="text-title font-bold tracking-tight text-ink sm:text-headline-sm">Check which requirements you meet</h2>
            <p className="mt-3 max-w-[42ch] text-ink-secondary">
              Answer a few questions about your course, grades, and household. In about two minutes, you can see where you qualify and what you still need to confirm.
            </p>
            <Link href="/login?next=/check" className={buttonClass("primary", "md", "mt-5")}>
              Sign in to check eligibility
            </Link>
          </div>
          <figure className="min-w-0 rounded-md bg-surface-hover p-3 sm:p-4" aria-labelledby="example-cap">
            <figcaption id="example-cap" className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm font-semibold text-ink">Example eligibility check</span>
              <span className="text-caption text-ink-secondary">2 of 3 met · 1 unanswered</span>
            </figcaption>
            <div className="rounded-md bg-surface">
              <RequirementRows items={EXAMPLE} answered />
            </div>
          </figure>
        </section>

        <section aria-labelledby="closing-h">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="closing-h" className="text-title-sm font-[650] text-ink sm:text-title">Closing soon</h2>
            <Link href="/explore" className="inline-flex min-h-11 items-center text-sm font-semibold nav:min-h-0">View all scholarships</Link>
          </div>
          {closing.rows.length ? (
            <ul className="grid gap-x-4 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
              {closing.rows.slice(0, 6).map((s) => (
                <li key={s.id} className="grid md:row-span-5 md:grid-rows-subgrid md:gap-y-0 md:[&>article]:row-span-5 md:[&>article]:grid md:[&>article]:grid-rows-subgrid md:[&>article]:items-start">
                  <ScholarshipCard s={s} signedIn={false} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-hairline-strong px-4 py-6 text-ink-secondary">
              Nothing is open right now. <Link href="/explore?status=upcoming">See what opens soon</Link>.
            </p>
          )}
        </section>

        <section aria-labelledby="types-h">
          <h2 id="types-h" className="mb-4 text-title-sm font-[650] text-ink sm:text-title">Browse by provider type</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PROVIDER_TYPES.map(([type, label, desc]) => (
              <li key={type}>
                <Link href={`/explore?type=${type}`} className="flex h-full flex-col gap-1 rounded-md border border-hairline bg-surface p-4 text-ink no-underline shadow-rest transition-colors duration-150 hover:border-hairline-strong sm:p-6">
                  <span className="text-base font-semibold">{label}</span>
                  <span className="flex-1 text-sm text-ink-secondary">{desc}</span>
                  <span className={`mt-2 text-sm font-semibold ${stats.by_type[type] ? "text-primary" : "text-ink-hint"}`}>{plural(stats.by_type[type] ?? 0, "listing")} open or upcoming</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="providers-h">
          <h2 id="providers-h" className="mb-4 text-title-sm font-[650] text-ink sm:text-title">Providers on Iskolar</h2>
          <ul className="grid gap-x-6 gap-y-4 rounded-md border border-hairline bg-surface p-4 shadow-rest sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
            {providers.map((p) => (
              <li key={p.id} className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 text-sm font-medium text-ink">
                <ProviderMark abbr={p.abbr} color={p.color} size="sm" />
                <span className="[overflow-wrap:anywhere]">{p.short_name ?? shortProvider(p.name)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
