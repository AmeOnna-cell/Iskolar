import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { unreadCount } from "@/lib/data/notifications";
import { DueText, Meter } from "@/components/scholarship/bits";
import { ScholarshipCard } from "@/components/scholarship/card";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { requireRole } from "@/lib/auth/session";
import { completeness, doNext, headline, urgentItems, type NextRow, type TrackedItem } from "@/lib/dashboard";
import { parseSearchParams, searchScholarships, statusOf } from "@/lib/data/scholarships";
import { getEligibilityCounts, getRecentAnnouncements, getRecentNotifications, getStudentProfile, listApplications } from "@/lib/data/student";
import { requirementLabel, stepFor, type EligibilityItem } from "@/lib/eligibility";
import { ago, formatDate, shortProvider, todayPH } from "@/lib/format";
import { TaskAction } from "./task-action";

export const metadata = { title: "Dashboard" };

// Section headings: Title Large (20px desktop, 18px mobile). Header links keep a 44px touch target.
function Section({ id, title, link, children }: { id: string; title: string; link?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={id} className="text-title-sm font-[650] text-ink sm:text-title">
          {title}
        </h2>
        {link ? (
          <Link href={link.href} className="-my-3 inline-flex min-h-11 items-center text-sm font-semibold">
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function DateChip({ on, urgent }: { on: string | null; urgent: boolean }) {
  if (!on) return <span aria-hidden="true" />;
  return (
    <span aria-hidden="true" className="overflow-hidden rounded-sm border border-hairline text-center">
      <span className={`block py-0.5 text-tab font-semibold ${urgent ? "bg-danger text-white" : "bg-surface-subtle text-ink-secondary"}`}>
        {formatDate(on).split(" ")[0]}
      </span>
      <span className="tnum block py-1 text-title-sm font-bold">{on.slice(8).replace(/^0/, "")}</span>
    </span>
  );
}

function NextItem({ r }: { r: NextRow }) {
  const urgent = r.due?.status === "open" && (r.due.days_left ?? 99) <= 3;
  return (
    <li className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-t border-hairline px-4 py-4 first:border-t-0 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:px-6">
      <DateChip on={r.due?.status === "open" ? r.due.closes_on : r.due?.opens_on ?? null} urgent={urgent} />
      <span className="min-w-0">
        <span className="block font-semibold text-ink">{r.title}</span>
        <span className="block text-sm text-ink-secondary">{r.detail}</span>
        {r.due ? <DueText s={r.due} className="mt-1 block" /> : null}
      </span>
      <span className="col-start-2 sm:col-start-auto">
        <TaskAction action={r.action} />
      </span>
    </li>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const user = await requireRole("student");
  const { password } = await searchParams;
  const today = todayPH();

  const [profile, apps, counts, matches, announcements, alerts, unread] = await Promise.all([
    getStudentProfile(user.id),
    listApplications(),
    getEligibilityCounts(user.id),
    searchScholarships({ ...parseSearchParams({ sort: "deadline" }), mine: true, pageSize: 20 }, user),
    getRecentAnnouncements(3),
    getRecentNotifications(4),
    unreadCount(),
  ]);

  const tracked: TrackedItem[] = apps.map((a) => {
    const s = a.scholarship!;
    const st = statusOf(s, today);
    const checked = new Set(a.checked.map((c) => c.document_id));
    const docs = [...s.documents].sort((x, y) => x.position - y.position);
    return {
      scholarshipId: s.id,
      slug: s.slug,
      name: s.name,
      providerName: shortProvider(s.provider?.name ?? ""),
      stage: a.stage,
      result: a.result,
      status: st.status,
      daysLeft: st.days_left,
      daysToOpen: st.days_to_open,
      closesOn: s.closes_on,
      opensOn: s.opens_on,
      verified: s.verification === "verified",
      docsTotal: docs.length,
      docsDone: docs.filter((d) => checked.has(d.id)).length,
      firstMissingDoc: docs.find((d) => !checked.has(d.id))?.name ?? null,
    };
  });
  const trackedIds = new Set(tracked.map((t) => t.scholarshipId));
  const open = matches.rows.filter((r) => r.status !== "closed" && !trackedIds.has(r.id));
  const maybe = open
    .filter((r) => r.verdict === "maybe" && r.first_gap)
    .slice(0, 2)
    .map((r) => ({ slug: r.slug, name: r.name, question: requirementLabel(r.first_gap as EligibilityItem), step: stepFor(r.first_gap as EligibilityItem) }));
  const qualifying = open
    .filter((r) => r.verdict === "yes")
    .map((r) => ({
      id: r.id, slug: r.slug, name: r.name, status: r.status as "open" | "upcoming" | "closed", daysLeft: r.days_left,
      opensOn: r.opens_on, closesOn: r.closes_on, sample: r.is_sample, verified: r.verification === "verified",
    }));

  const urgent = urgentItems(tracked);
  const rows = doNext(tracked, qualifying, maybe);
  // Recommended never repeats a scholarship that "Do this next" already lists.
  const listed = new Set(rows.map((r) => r.key.replace(/^[a-z]+-/, "")));
  const recs = open.filter((r) => (r.verdict === "yes" || r.verdict === "maybe") && !listed.has(r.slug)).slice(0, 3);
  const head = headline({ hasProfile: Boolean(profile), urgent, qualifyCount: counts.yes });
  const active = tracked.filter((t) => t.stage !== "submitted" && t.status !== "closed");
  const submitted = tracked.filter((t) => t.stage === "submitted");
  const profileState = completeness(profile as Record<string, unknown> | null);
  const firstMissing = profileState.missing[0];
  const stats: { label: string; value: number; icon: IconName }[] = [
    { label: "Due soon", value: urgent.length, icon: "cal" },
    { label: "Tracked", value: tracked.length, icon: "list" },
    { label: "Preparing", value: tracked.filter((item) => item.stage === "preparing").length, icon: "check" },
    { label: "Unread", value: unread, icon: "bell" },
  ];
  const SHOWN = 3;

  return (
    <div className="page-container py-5 sm:py-8">
      <div className="flex flex-col gap-6 sm:gap-8">
        {password === "updated" ? <Notice tone="ok">Your password is updated. Other devices were signed out.</Notice> : null}

        <header>
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
            <div>
              <h1 className="text-headline-sm font-bold tracking-tight text-ink">Dashboard</h1>
              <p className="mt-1 text-sm text-ink-secondary">Track preparation, updates, and upcoming deadlines.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/check" variant="outline">
                <Icon name="check" size={16} /> Check my eligibility
              </ButtonLink>
              <ButtonLink href="/explore">
                <Icon name="search" size={16} /> Browse scholarships
              </ButtonLink>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-y border-hairline py-5 sm:mt-8 sm:grid-cols-4 sm:py-7">
            {stats.map(({ label, value, icon }) => (
              <div key={label}>
                <dt className="flex items-center gap-2 text-sm text-ink-secondary">
                  <Icon name={icon} size={16} /> {label}
                </dt>
                <dd className={`tnum mt-2 text-headline-sm font-semibold ${value === 0 ? "text-ink-hint" : "text-ink"}`}>{value}</dd>
              </div>
            ))}
          </dl>
        </header>

        <Section id="next-h" title="Do this next">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <p className="text-ink-secondary" data-testid="dashboard-fact">{head.fact}</p>
            {head.action.href !== "/check" && head.action.href !== "/explore" ? (
              <Link href={head.action.href} className="font-semibold">{head.action.label}</Link>
            ) : null}
          </div>
          {rows.length ? (
            <div className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
              <ul data-testid="do-next-list">
                {rows.slice(0, SHOWN).map((r) => (
                  <NextItem key={r.key} r={r} />
                ))}
              </ul>
              {rows.length > SHOWN ? (
                <details className="group border-t border-hairline">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm font-semibold text-primary sm:px-6 [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">Show {rows.length - SHOWN} more</span>
                    <span className="hidden group-open:inline">Show fewer</span>
                  </summary>
                  <ul className="border-t border-hairline">
                    {rows.slice(SHOWN).map((r) => (
                      <NextItem key={r.key} r={r} />
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-hairline-strong px-4 py-4 text-sm text-ink-secondary">
              You&apos;re all caught up.{" "}
              {tracked.length === 0 ? (
                <>
                  <Link href="/explore">Save a scholarship</Link> to get a checklist and reminders.
                </>
              ) : null}
            </p>
          )}
        </Section>

        {/* For your information: a ruled break, then matches, progress, news and answers. */}
        <div className="flex flex-col gap-8 border-t border-hairline pt-8">
          {profile ? (
            <Section id="recs-h" title="Recommended for you" link={{ href: "/explore?mine=1&sort=match", label: "See all matches" }}>
              {recs.length ? (
                <ul className="flex flex-col gap-3">
                  {recs.map((r) => (
                    <li key={r.id}>
                      <ScholarshipCard s={r} signedIn compact reason />
                    </li>
                  ))}
                </ul>
              ) : open.some((r) => r.verdict === "yes" || r.verdict === "maybe") ? (
                <p className="text-sm text-ink-secondary">Your matches are all in Do this next, above.</p>
              ) : (
                <p className="text-sm text-ink-secondary">
                  No new matches right now. We&apos;ll alert you when one is posted. <Link href="/check?step=1">Update your answers</Link>
                </p>
              )}
            </Section>
          ) : null}

          <Section id="progress-h" title="My applications" link={{ href: "/applications", label: "Open tracker" }}>
            {active.length || submitted.length ? (
              <ul className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
                {active.map((t) => (
                  <li key={t.slug} className="border-t border-hairline px-4 py-4 first:border-t-0 sm:px-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <Link href={`/s/${t.slug}`} className="font-semibold text-ink no-underline hover:underline">
                        {t.name}
                      </Link>
                      <span className="tnum text-sm text-ink-secondary">
                        {t.stage === "saved" ? "Saved" : "Preparing"} · {t.docsDone} of {t.docsTotal} ready
                      </span>
                    </div>
                    <div className="mt-2">
                      <Meter value={t.docsDone} max={t.docsTotal} label={`${t.name}: ${t.docsDone} of ${t.docsTotal} documents ready`} />
                    </div>
                  </li>
                ))}
                {submitted.length ? (
                  <li className="border-t border-hairline px-4 py-4 text-sm text-ink-secondary first:border-t-0 sm:px-6">
                    Submitted: {submitted.map((t) => t.name).join(", ")}. Waiting for results.
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-sm text-ink-secondary">
                Nothing tracked yet. <Link href="/explore">Find scholarships</Link> and save the ones you want to apply for.
              </p>
            )}
          </Section>

          <Section id="news-h" title="Announcements and alerts" link={{ href: "/announcements", label: "All announcements" }}>
            {announcements.length || alerts.length ? (
              <ul className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
                {alerts.map((n) => (
                  <li key={n.id} className="relative border-t border-hairline px-4 py-4 first:border-t-0 hover:bg-surface-hover sm:px-6">
                    <p className="font-semibold text-ink">
                      {/* Plain <a>: opening marks the alert read, so it must never be prefetched. */}
                      <a href={`/alerts/${n.id}`} className="text-ink no-underline after:absolute after:inset-0">
                        {n.title}
                      </a>
                    </p>
                    {n.body ? <p className="text-sm text-ink-secondary">{n.body}</p> : null}
                    <p className="mt-1 text-caption text-ink-hint">{ago(n.created_at)}</p>
                  </li>
                ))}
                {announcements.map((a) => (
                  <li key={a.id} className="relative border-t border-hairline px-4 py-4 first:border-t-0 hover:bg-surface-hover sm:px-6">
                    <p className="font-semibold text-ink">
                      <Link href={`/announcements?a=${a.scholarship?.slug ?? "general"}`} className="text-ink no-underline after:absolute after:inset-0">
                        {a.title}
                      </Link>
                    </p>
                    <p className="mt-1 line-clamp-3 max-w-[70ch] text-sm text-ink-secondary">{a.body}</p>
                    <p className="mt-1 text-caption text-ink-hint">
                      {a.posted_as}, {ago(a.published_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-secondary">No announcements yet.</p>
            )}
          </Section>

          <section aria-labelledby="profile-h" className="rounded-md border border-hairline bg-surface-subtle px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3">
              <h2 id="profile-h" className="text-sm font-semibold text-ink">
                Eligibility answers: {profileState.pct}% complete
              </h2>
              <Link href={`/check?step=${firstMissing ? firstMissing[2] : 1}`} className="-my-3 inline-flex min-h-11 items-center text-sm font-semibold">
                {profileState.pct === 100 ? "Edit answers" : "Add answers"}
              </Link>
            </div>
            {profileState.missing.length ? (
              <p className="mt-1 text-sm text-ink-secondary">
                Still to answer: {profileState.missing.map(([, l]) => l).join(", ")}. More answers mean more accurate matches.
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
