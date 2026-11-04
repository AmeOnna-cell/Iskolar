import Link from "next/link";
import { Icon } from "@/components/icons";
import { ProviderMark } from "@/components/scholarship/bits";
import { ScholarshipCard } from "@/components/scholarship/card";
import { buttonClass } from "@/components/ui/button";
import { getListingStats, getProvidersWithListings, parseSearchParams, searchScholarships } from "@/lib/data/scholarships";
import { plural, shortProvider } from "@/lib/format";
import { FIELDS, PROVIDER_TYPES } from "@/lib/reference";

// Signed-in visitors are redirected to their home by middleware, so this page is the public front door.
export default async function LandingPage() {
  const [stats, closing, providers] = await Promise.all([
    getListingStats(),
    searchScholarships(parseSearchParams({ status: "open", sort: "deadline" }), null),
    getProvidersWithListings(),
  ]);

  return (
    <>
      <section className="bg-band py-10 text-white sm:py-14">
        <div className="page-container">
          <h1 className="max-w-[22ch] text-headline-sm font-bold tracking-tight sm:text-display">
            Find scholarships for college students in the Philippines
          </h1>
          <p className="mt-4 max-w-[56ch] text-base text-band-text-soft sm:text-title-sm sm:leading-normal">
            Government, private and school scholarships in one place, with clear requirements and deadline reminders.
          </p>
          <form action="/explore" role="search" className="mt-8 grid max-w-[860px] gap-2 rounded-lg bg-surface p-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto]">
            <label className="flex items-center gap-2 rounded-sm px-3 text-ink-hint focus-within:ring-2 focus-within:ring-primary">
              <Icon name="search" size={18} />
              <span className="sr-only">Keyword</span>
              <input name="q" maxLength={100} placeholder="Scholarship name or provider" className="h-11 w-full bg-transparent text-base text-ink placeholder:text-ink-hint focus:outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-sm border-hairline px-3 text-ink-hint focus-within:ring-2 focus-within:ring-primary max-sm:border-t sm:border-l">
              <Icon name="doc" size={18} />
              <span className="sr-only">Course area</span>
              <select name="field" defaultValue="" className="h-11 w-full bg-transparent text-base text-ink focus:outline-none">
                <option value="">Any course</option>
                {FIELDS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
            <button type="submit" className={buttonClass("primary", "md", "h-12 px-6")}>
              Find scholarships
            </button>
          </form>
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-band-text-soft">
            Popular searches:
            {["TES", "DOST", "OWWA", "CHED"].map((k) => (
              <Link key={k} href={`/explore?q=${k}`} className="inline-flex min-h-9 items-center rounded-full border border-white/30 px-3 text-sm text-white no-underline hover:bg-white/10">
                {k}
              </Link>
            ))}
          </p>
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            {[
              [String(stats.open), "open now"],
              [String(stats.upcoming), "opening soon"],
              // Sample listings are never counted as verified.
              ...(stats.total > stats.sample ? [[`${stats.verified} of ${stats.total - stats.sample}`, "verified with official sources"]] : []),
              ...(stats.sample ? [[String(stats.sample), stats.sample === 1 ? "sample listing, for trying Iskolar out" : "sample listings, for trying Iskolar out"]] : []),
            ].map(([value, label]) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="text-sm text-band-text-soft">{label}</dt>
                <dd className="tnum text-headline-sm font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="page-container flex flex-col gap-12 py-10 sm:py-12">
        <section aria-labelledby="check-h" className="flex flex-wrap items-center gap-5 rounded-md border border-hairline bg-surface p-6 shadow-rest">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-wash text-primary">
            <Icon name="check" size={24} />
          </span>
          <div className="min-w-[16rem] flex-1">
            <h2 id="check-h" className="text-title-sm font-[650] text-ink">Not sure what you qualify for?</h2>
            <p className="mt-1 max-w-[64ch] text-ink-secondary">
              Answer a few questions about your course, grades and family. We&apos;ll show which scholarships fit you and explain why. Takes about 2 minutes.
            </p>
          </div>
          <Link href="/check" className={buttonClass("primary")}>Check my eligibility</Link>
        </section>

        <section aria-labelledby="closing-h">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="closing-h" className="text-title-sm font-[650] text-ink sm:text-title">Closing soon</h2>
            <Link href="/explore" className="text-sm font-semibold">View all scholarships</Link>
          </div>
          {closing.rows.length ? (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {closing.rows.slice(0, 6).map((s) => (
                <li key={s.id}>
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
                <Link href={`/explore?type=${type}`} className="flex h-full flex-col gap-1 rounded-md border border-hairline bg-surface p-5 text-ink no-underline shadow-rest transition-colors duration-150 hover:border-primary">
                  <span className="text-base font-semibold">{label}</span>
                  <span className="text-sm text-ink-secondary">{desc}</span>
                  <span className="mt-2 text-sm font-semibold text-primary">{plural(stats.by_type[type] ?? 0, "listing")} open or upcoming</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="providers-h">
          <h2 id="providers-h" className="mb-4 text-title-sm font-[650] text-ink sm:text-title">Providers on Iskolar</h2>
          <ul className="flex flex-wrap gap-x-8 gap-y-4 rounded-md border border-hairline bg-surface p-6 shadow-rest">
            {providers.map((p) => (
              <li key={p.id} className="flex items-center gap-3 text-sm font-medium text-ink">
                <ProviderMark abbr={p.abbr} color={p.color} size="sm" />
                {p.short_name ?? shortProvider(p.name)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
