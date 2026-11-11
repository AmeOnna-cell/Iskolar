import { DocumentProgressProvider } from "@/components/scholarship/document-progress";
import { DetailDrawer } from "@/components/scholarship/split";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getScholarshipDetail, statusOf } from "@/lib/data/scholarships";
import { getEvaluation, listApplications } from "@/lib/data/student";
import { ago, dueText, formatDate, shortProvider, todayPH, urgency } from "@/lib/format";
import { ApplicationDetail } from "./detail";
import { TrackingFilters, TrackingList, type TrackRow } from "./tracking-list";

export const metadata = { title: "My Applications" };

const FILTERS = [
  { key: "all", label: "All scholarships" },
  { key: "saved", label: "Saved" },
  { key: "preparing", label: "Preparing" },
  { key: "submitted", label: "Submitted" },
  { key: "waiting", label: "Waiting" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Not approved" },
  { key: "results", label: "All results" },
] as const;

const STAGE = {
  // Amber and red stay for deadlines (Status Means Status); stages use neutral and blue.
  saved: { label: "Saved", dot: "bg-ink-hint" },
  preparing: { label: "Preparing", dot: "bg-primary" },
  submitted: { label: "Submitted", dot: "bg-ink" },
  approved: { label: "Approved", dot: "bg-ok" },
  rejected: { label: "Not approved", dot: "bg-danger" },
};

type SP = Promise<{ tab?: string; q?: string; s?: string; d?: string }>;

export default async function ApplicationsPage({ searchParams }: { searchParams: SP }) {
  const user = await requireRole("student");
  const sp = await searchParams;
  const apps = await listApplications();
  const today = todayPH();

  const tab = FILTERS.find((item) => item.key === sp.tab)?.key ?? "all";
  const query = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const fold = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const terms = fold(query).split(/\s+/).filter(Boolean);
  const all = apps.filter((app) => {
    const s = app.scholarship!;
    const searchable = fold([s.name, s.provider?.name, s.provider?.short_name, s.provider?.abbr, s.location_label].join(" "));
    if (!terms.every((term) => searchable.includes(term))) return false;
    if (tab === "all") return true;
    if (tab === "results") return app.stage === "submitted" && app.result !== "pending";
    if (tab === "waiting") return app.stage === "submitted" && app.result === "pending";
    if (tab === "approved" || tab === "rejected") return app.stage === "submitted" && app.result === tab;
    return app.stage === tab;
  }).sort((a, b) => (a.scholarship!.closes_on ?? "9999").localeCompare(b.scholarship!.closes_on ?? "9999"));

  const rows: TrackRow[] = all.map((a) => {
    const s = a.scholarship!;
    const st = statusOf(s, today);
    const ids = new Set(s.documents.map((d) => d.id));
    return {
      slug: s.slug,
      name: s.name,
      amount: s.amount_text,
      location: s.location_label ?? shortProvider(s.provider?.name ?? ""),
      updated: ago(a.updated_at),
      stage: STAGE[a.stage === "submitted" && a.result !== "pending" ? a.result : a.stage],
      deadline: s.closes_on ? formatDate(s.closes_on) : null,
      due: { text: st.status === "closed" ? "Closed" : dueText({ ...st, opens_on: s.opens_on, closes_on: s.closes_on }), tone: urgency(st.status, st.days_left) },
      docs: { checked: a.checked.filter((c) => ids.has(c.document_id)).map((c) => c.document_id), total: s.documents.length },
    };
  });

  const app = all.find((a) => a.scholarship!.slug === sp.s) ?? all[0];
  const [s, evaluation] = app
    ? await Promise.all([getScholarshipDetail(app.scholarship!.slug), getEvaluation(user.id, app.scholarship!.id)])
    : [null, null];
  const inDrawer = sp.d === "1" && Boolean(s) && sp.s === s?.slug;
  const detail = s && app ? <ApplicationDetail s={s} app={app} evaluation={evaluation} /> : null;

  return (
    <div className="page-container py-6 sm:py-8">
      <h1 className="flex flex-wrap items-center gap-2 text-headline-sm font-bold tracking-tight text-ink">
        My Applications
        {apps.length ? (
          <span className="tnum rounded-full bg-primary-wash px-2.5 py-1 text-sm font-semibold text-primary" aria-label={`${apps.length} tracked scholarships`}>
            {apps.length}
          </span>
        ) : null}
      </h1>
      <p className="mt-2 text-sm text-ink-secondary">Saved scholarships and your application progress. Only the provider can confirm your official status.</p>

      <TrackingFilters key={`${tab}:${query}`} filters={FILTERS} tab={tab} query={query} />

      <DocumentProgressProvider>
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          <section aria-labelledby="tracking-h">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="tracking-h" className="text-sm font-semibold text-ink">Tracking list</h2>
              <span className="text-caption text-ink-secondary" role="status">{rows.length} {rows.length === 1 ? "result" : "results"}</span>
            </div>
            {rows.length ? (
              <TrackingList rows={rows} tab={tab} query={query} selected={s?.slug ?? null} />
            ) : (
              <div className="px-4 py-8 text-sm text-ink-secondary">
                <p>{tab !== "all" || query ? "No tracked scholarships match these filters." : "You haven’t tracked any scholarships yet."}</p>
                <ButtonLink href="/explore" variant="outline" className="mt-3">Browse scholarships</ButtonLink>
              </div>
            )}
          </section>
          {detail && !inDrawer ? (
            <section
              tabIndex={0}
              aria-label={`Application: ${s!.name}`}
              className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-auto rounded-md border border-hairline bg-surface shadow-rest lg:block"
            >
              {detail}
            </section>
          ) : !inDrawer ? (
            <section aria-label="Scholarship details" className="hidden min-h-[20rem] rounded-md border border-hairline bg-surface p-6 lg:block">
              <h2 className="font-semibold text-ink">No scholarship selected</h2>
              <p className="mt-2 text-sm text-ink-secondary">Choose a scholarship from the list to review its details.</p>
            </section>
          ) : null}
        </div>
        {detail && inDrawer ? (
          <DetailDrawer slug={s!.slug} name={s!.name}>
            {detail}
          </DetailDrawer>
        ) : null}
      </DocumentProgressProvider>
    </div>
  );
}
