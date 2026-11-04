import Link from "next/link";
import { Icon } from "@/components/icons";
import { DueText, Meter, Pill, ProviderMark } from "@/components/scholarship/bits";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { statusOf } from "@/lib/data/scholarships";
import { listApplications } from "@/lib/data/student";
import { shortProvider, todayPH } from "@/lib/format";
import { RowControl } from "./row-control";

export const metadata = { title: "My applications" };

const TABS = [
  { key: "saved", label: "Saved", empty: ["No saved scholarships", "Tap the bookmark on any scholarship to save it here."] },
  { key: "preparing", label: "Preparing", empty: ["Nothing in preparation", "Choose “Start preparing” on a scholarship to get its document checklist."] },
  { key: "submitted", label: "Submitted", empty: ["No submitted applications", "After you send an application, mark it as submitted to track the result."] },
  { key: "results", label: "Results", empty: ["No results yet", "When you hear back from a provider, record the result here."] },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireRole("student");
  const { tab: rawTab } = await searchParams;
  const apps = await listApplications();
  const today = todayPH();

  const inTab = (a: (typeof apps)[number], k: TabKey) =>
    k === "results" ? a.stage === "submitted" && a.result !== "pending" : k === "submitted" ? a.stage === "submitted" && a.result === "pending" : a.stage === k;
  const counts = Object.fromEntries(TABS.map((t) => [t.key, apps.filter((a) => inTab(a, t.key)).length])) as Record<TabKey, number>;
  const tab: TabKey =
    TABS.find((t) => t.key === rawTab)?.key ?? TABS.find((t) => t.key !== "saved" && counts[t.key])?.key ?? TABS.find((t) => counts[t.key])?.key ?? "saved";
  const meta = TABS.find((t) => t.key === tab)!;
  const items = apps
    .filter((a) => inTab(a, tab))
    .sort((a, b) => (a.scholarship!.closes_on ?? "9999").localeCompare(b.scholarship!.closes_on ?? "9999"));

  return (
    <div className="page-container py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">My applications</h1>
          <p className="mt-2 text-ink-secondary">Track what you&apos;ve saved, what you&apos;re preparing, and what you&apos;ve sent.</p>
        </div>
        <ButtonLink href="/explore" variant="outline">
          <Icon name="search" size={18} /> Find more
        </ButtonLink>
      </div>

      <nav aria-label="Application stages" className="mt-6 mb-4 flex gap-1 overflow-x-auto border-b border-hairline">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/applications?tab=${t.key}`}
            aria-current={t.key === tab ? "page" : undefined}
            className={`-mb-px flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold whitespace-nowrap no-underline sm:px-4 ${
              t.key === tab ? "border-primary text-primary" : "border-transparent text-ink-secondary hover:text-ink"
            }`}
          >
            {t.label}
            {counts[t.key] ? <span className="tnum rounded-full border border-hairline bg-surface-subtle px-2 text-caption text-ink-secondary">{counts[t.key]}</span> : null}
          </Link>
        ))}
      </nav>

      <div className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
        {items.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <h2 className="text-title-sm font-[650] text-ink">{meta.empty[0]}</h2>
            <p className="mx-auto mt-2 max-w-[44ch] text-ink-secondary">{meta.empty[1]}</p>
            <ButtonLink href="/explore" className="mt-6">Find scholarships</ButtonLink>
          </div>
        ) : (
          <ul>
            {items.map((a) => {
              const s = a.scholarship!;
              const st = statusOf(s, today);
              const ids = new Set(s.documents.map((d) => d.id));
              const done = a.checked.filter((c) => ids.has(c.document_id)).length;
              const checked = new Set(a.checked.map((c) => c.document_id));
              const missing = [...s.documents].sort((x, y) => x.position - y.position).filter((d) => !checked.has(d.id)).map((d) => d.name.split(":")[0]!);
              return (
                <li key={a.id} className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-4 gap-y-3 border-t border-hairline px-4 py-4 first:border-t-0 sm:px-6 lg:grid-cols-[44px_minmax(0,1fr)_240px_auto] lg:items-center">
                  <ProviderMark abbr={s.provider!.abbr} color={s.provider!.color} />
                  <div className="min-w-0">
                    <Link href={`/s/${s.slug}`} className="-my-3 inline-flex min-h-11 items-center font-semibold text-ink no-underline hover:underline">{s.name}</Link>
                    <p className="text-sm text-ink-secondary">{shortProvider(s.provider!.name)}</p>
                    <DueText s={{ ...st, opens_on: s.opens_on, closes_on: s.closes_on }} />
                  </div>
                  <div className="col-start-2 text-sm text-ink-secondary lg:col-start-auto">
                    {a.stage === "submitted" ? (
                      a.result === "approved" ? (
                        <Pill tone="ok" icon="yes">Approved</Pill>
                      ) : a.result === "rejected" ? (
                        <Pill tone="danger" icon="no">Not approved</Pill>
                      ) : (
                        <Pill>Waiting for results</Pill>
                      )
                    ) : a.stage === "saved" ? (
                      // No progress meter before work starts: just what's ahead.
                      `${s.documents.length} ${s.documents.length === 1 ? "document" : "documents"} to prepare`
                    ) : (
                      <>
                        <div className="mb-1">
                          <Meter value={done} max={s.documents.length} label={`Documents ready for ${s.name}`} />
                        </div>
                        {done} of {s.documents.length} documents ready
                        {missing.length ? (
                          <span className="mt-1 block" data-testid="still-need">
                            Still need: {missing.slice(0, 2).join(", ")}
                            {missing.length > 2 ? ` +${missing.length - 2}` : ""}.{" "}
                            <Link href={`/s/${s.slug}#documents-${s.slug}`} className="font-semibold">
                              Continue checklist
                            </Link>
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                  <div className="col-start-2 lg:col-start-auto">
                    <RowControl applicationId={a.id} scholarshipId={s.id} name={s.name} stage={a.stage} result={a.result} docsDone={done} />
                  </div>
                  {a.result === "approved" && s.renewal ? (
                    <p className="col-start-2 rounded-sm bg-ok-wash px-3 py-2 text-sm text-ok lg:col-span-3">
                      To keep it: {s.renewal} We&apos;ll remind you when renewal opens.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
