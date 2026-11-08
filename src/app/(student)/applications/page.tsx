import Link from "next/link";
import { Icon } from "@/components/icons";
import { DetailDrawer } from "@/components/scholarship/split";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getScholarshipDetail, statusOf } from "@/lib/data/scholarships";
import { getEvaluation, listApplications } from "@/lib/data/student";
import { dueText, formatDate, shortProvider, todayPH, urgency } from "@/lib/format";
import { ApplicationDetail } from "./detail";
import { TrackingList, type TrackRow } from "./tracking-list";

export const metadata = { title: "My applications" };

const TABS = [
  { key: "saved", label: "Saved", empty: ["No saved scholarships", "Tap the bookmark on any scholarship to save it here."] },
  { key: "preparing", label: "Preparing", empty: ["Nothing in preparation", "Choose “Start preparing” on a scholarship to get its document checklist."] },
  { key: "submitted", label: "Submitted", empty: ["No submitted applications", "After you send an application, mark it as submitted to track the result."] },
  { key: "results", label: "Results", empty: ["No results yet", "When you hear back from a provider, record the result here."] },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const STAGE = {
  // Amber and red stay for deadlines (Status Means Status); stages use neutral and blue.
  saved: { label: "Saved", dot: "bg-ink-hint" },
  preparing: { label: "Preparing", dot: "bg-primary" },
  submitted: { label: "Submitted", dot: "bg-ink" },
  approved: { label: "Approved", dot: "bg-ok" },
  rejected: { label: "Not approved", dot: "bg-danger" },
};

type SP = Promise<{ tab?: string; s?: string; d?: string }>;

export default async function ApplicationsPage({ searchParams }: { searchParams: SP }) {
  const user = await requireRole("student");
  const sp = await searchParams;
  const apps = await listApplications();
  const today = todayPH();

  const inTab = (a: (typeof apps)[number], k: TabKey) =>
    k === "results" ? a.stage === "submitted" && a.result !== "pending" : k === "submitted" ? a.stage === "submitted" && a.result === "pending" : a.stage === k;
  const counts = Object.fromEntries(TABS.map((t) => [t.key, apps.filter((a) => inTab(a, t.key)).length])) as Record<TabKey, number>;
  const tab: TabKey =
    TABS.find((t) => t.key === sp.tab)?.key ?? TABS.find((t) => t.key !== "saved" && counts[t.key])?.key ?? TABS.find((t) => counts[t.key])?.key ?? "saved";
  const meta = TABS.find((t) => t.key === tab)!;
  const tabOf = (a: (typeof apps)[number]) => TABS.find((t) => inTab(a, t.key))!.key;
  // Every application (search looks across stages), closing soonest first.
  const all = [...apps].sort((a, b) => (a.scholarship!.closes_on ?? "9999").localeCompare(b.scholarship!.closes_on ?? "9999"));

  // ponytail: one evaluate_eligibility call per tracked application; a student tracks a handful.
  // Move to one set-based RPC if lists grow past a few dozen rows.
  const evals = await Promise.all(all.map((a) => getEvaluation(user.id, a.scholarship!.id)));
  const rows: TrackRow[] = all.map((a, i) => {
    const s = a.scholarship!;
    const st = statusOf(s, today);
    const ids = new Set(s.documents.map((d) => d.id));
    const e = evals[i];
    return {
      tab: tabOf(a),
      slug: s.slug,
      name: s.name,
      provider: shortProvider(s.provider!.name),
      stage: STAGE[a.stage === "submitted" && a.result !== "pending" ? a.result : a.stage],
      deadline: s.closes_on ? `Deadline ${formatDate(s.closes_on)}` : "No deadline yet",
      due: { text: st.status === "closed" ? "Closed" : dueText({ ...st, opens_on: s.opens_on, closes_on: s.closes_on }), tone: urgency(st.status, st.days_left) },
      eligibility: e && e.verdict !== "none" ? { met: e.met, total: e.total, verdict: e.verdict } : null,
      docs: { done: a.checked.filter((c) => ids.has(c.document_id)).length, total: s.documents.length },
    };
  });

  // The selection may come from a search across stages, so look in every application; default to the tab's first.
  const picked = all.findIndex((a) => a.scholarship!.slug === sp.s);
  const index = picked >= 0 ? picked : all.findIndex((a) => inTab(a, tab));
  const app = all[index];
  const empty = counts[tab] === 0;
  const s = app ? await getScholarshipDetail(app.scholarship!.slug) : null;
  const inDrawer = sp.d === "1" && Boolean(s) && sp.s === s?.slug;
  const detail = s && app ? <ApplicationDetail s={s} app={app} evaluation={evals[index] ?? null} /> : null;

  const tabs = (
    // Inset hairline instead of a border + -mb-px overlap: the overlap made the row overflow vertically (stray scrollbar).
    <nav aria-label="Application stages" className="mb-3 flex gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--hairline)] [scrollbar-width:none] max-sm:pr-12 max-sm:[mask-image:linear-gradient(to_right,#000_80%,transparent)]">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/applications?tab=${t.key}`}
          aria-current={t.key === tab ? "page" : undefined}
          className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold whitespace-nowrap no-underline ${
            t.key === tab ? "border-primary text-primary" : "border-transparent text-ink-secondary hover:text-ink"
          }`}
        >
          {t.label}
          {counts[t.key] ? <span className="tnum rounded-full border border-hairline bg-surface-subtle px-2 text-caption text-ink-secondary">{counts[t.key]}</span> : null}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="page-container py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">My applications</h1>
          <p className="mt-1 text-ink-secondary">Track what you&apos;ve saved, what you&apos;re preparing, and what you&apos;ve sent.</p>
        </div>
        <ButtonLink href="/explore" variant="outline">
          <Icon name="search" size={18} /> Find more
        </ButtonLink>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <section aria-labelledby="tracking-h">
          {/* On phones the list is the page, so its heading would only repeat the h1. */}
          <h2 id="tracking-h" className="mb-3 text-title-sm font-[650] text-ink max-lg:sr-only">Tracking list</h2>
          <TrackingList rows={rows} tab={tab} selected={app?.scholarship!.slug ?? null} tabs={tabs} />
          {empty ? (
            <div className="rounded-md border border-hairline bg-surface px-6 py-10 text-center shadow-rest">
              <h3 className="text-title-sm font-[650] text-ink">{meta.empty[0]}</h3>
              <p className="mx-auto mt-2 max-w-[44ch] text-ink-secondary">{meta.empty[1]}</p>
              <ButtonLink href="/explore" className="mt-6">Find scholarships</ButtonLink>
            </div>
          ) : null}
        </section>
        {detail && !inDrawer ? (
          <section
            tabIndex={0}
            aria-label={`Application: ${s!.name}`}
            className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-auto rounded-md border border-hairline bg-surface shadow-rest lg:block"
          >
            {detail}
          </section>
        ) : null}
      </div>
      {detail && inDrawer ? (
        <DetailDrawer slug={s!.slug} name={s!.name}>
          {detail}
        </DetailDrawer>
      ) : null}
    </div>
  );
}
