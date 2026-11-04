import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { DueText } from "@/components/scholarship/bits";
import { ScholarshipCard } from "@/components/scholarship/card";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { requireRole } from "@/lib/auth/session";
import { completeness, headline, nextSteps, urgentItems, type Task, type TrackedItem } from "@/lib/dashboard";
import { parseSearchParams, searchScholarships, statusOf } from "@/lib/data/scholarships";
import { getEligibilityCounts, getRecentAnnouncements, getRecentNotifications, getStudentProfile, listApplications } from "@/lib/data/student";
import { requirementLabel, stepFor, type EligibilityItem } from "@/lib/eligibility";
import { ago, formatDate, longDate, plural, shortProvider, todayPH } from "@/lib/format";
import { TaskAction } from "./task-action";

export const metadata = { title: "Dashboard" };

const TASK_STYLE: Record<Task["tone"], string> = {
  urgent: "bg-danger-wash text-danger",
  warn: "bg-warn-wash text-warn",
  info: "bg-primary-wash text-primary",
};

function Section({ id, title, link, children }: { id: string; title: string; link?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-title-sm font-[650] text-ink">
          {title}
        </h2>
        {link ? (
          <Link href={link.href} className="text-sm font-semibold">
            {link.label}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function greeting() {
  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const user = await requireRole("student");
  const { password } = await searchParams;
  const today = todayPH();

  const [profile, apps, counts, matches, announcements, alerts] = await Promise.all([
    getStudentProfile(user.id),
    listApplications(),
    getEligibilityCounts(user.id),
    searchScholarships({ ...parseSearchParams({ sort: "deadline" }), mine: true, pageSize: 20 }, user),
    getRecentAnnouncements(3),
    getRecentNotifications(4),
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
  const recs = open.filter((r) => r.verdict === "yes" || r.verdict === "maybe").slice(0, 3);
  const maybe = open
    .filter((r) => r.verdict === "maybe" && r.first_gap)
    .slice(0, 2)
    .map((r) => ({ slug: r.slug, name: r.name, question: requirementLabel(r.first_gap as EligibilityItem), step: stepFor(r.first_gap as EligibilityItem) }));
  const unverified = open.filter((r) => r.verdict === "yes" && r.verification !== "verified").map((r) => ({ slug: r.slug, name: r.name, daysLeft: r.days_left }));

  const urgent = urgentItems(tracked);
  const tasks = nextSteps(tracked, maybe, unverified);
  const head = headline({ hasProfile: Boolean(profile), urgent, qualifyCount: counts.yes });
  const inProgress = tracked.filter((t) => t.stage !== "submitted" && t.status !== "closed");
  const progress = {
    saved: tracked.filter((t) => t.stage === "saved").length,
    preparing: tracked.filter((t) => t.stage === "preparing").length,
    submitted: tracked.filter((t) => t.stage === "submitted").length,
    docsDone: inProgress.reduce((n, t) => n + t.docsDone, 0),
    docsTotal: inProgress.reduce((n, t) => n + t.docsTotal, 0),
  };
  const profileState = completeness(profile as Record<string, unknown> | null);
  const first = user.fullName?.trim().split(/\s+/)[0];

  return (
    <div className="page-container py-8">
      <div className="reading-column flex flex-col gap-10">
        {password === "updated" ? <Notice tone="ok">Your password is updated. Other devices were signed out.</Notice> : null}

        {/* 1. Greeting + one primary action */}
        <header>
          <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">
            {greeting()}
            {first ? `, ${first}` : ""}
          </h1>
          <p className="mt-2 text-base text-ink sm:text-title-sm sm:leading-normal" data-testid="dashboard-fact">
            {head.fact}
          </p>
          <p className="mt-1 text-sm text-ink-hint">{longDate(today)}</p>
          <ButtonLink href={head.action.href} className="mt-5">
            {head.action.label}
          </ButtonLink>
        </header>

        {/* 2. Urgent */}
        <Section id="urgent-h" title="Closing this week">
          {urgent.length ? (
            <ul className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest" data-testid="urgent-list">
              {urgent.map((t) => {
                const left = t.docsTotal - t.docsDone;
                const red = (t.daysLeft ?? 99) <= 3;
                return (
                  <li key={t.slug} className="border-t border-hairline first:border-t-0">
                    <Link href={`/s/${t.slug}#documents-${t.slug}`} className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-4 px-4 py-4 text-ink no-underline hover:bg-surface-hover sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:px-5">
                      <span className="overflow-hidden rounded-sm border border-hairline text-center">
                        <span className={`block py-0.5 text-tab font-semibold ${red ? "bg-danger text-white" : "bg-surface-subtle text-ink-secondary"}`}>
                          {t.closesOn ? formatDate(t.closesOn).split(" ")[0] : ""}
                        </span>
                        <span className="tnum block py-1 text-title-sm font-bold">{t.closesOn ? t.closesOn.slice(8).replace(/^0/, "") : ""}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{t.name}</span>
                        <span className="block text-sm text-ink-secondary">
                          {left > 0 ? `${plural(left, "document")} still missing` : "All documents ready to submit"}
                          {t.stage === "saved" ? " · not started" : ""}
                        </span>
                      </span>
                      <DueText s={{ status: t.status, days_left: t.daysLeft, opens_on: t.opensOn, closes_on: t.closesOn }} className="col-start-2 sm:col-start-auto sm:text-right" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-hairline-strong px-4 py-4 text-sm text-ink-secondary">
              Nothing you track closes in the next 7 days.{" "}
              {tracked.length === 0 ? <Link href="/explore">Save a scholarship</Link> : null}
              {tracked.length === 0 ? " to get a checklist and reminders." : null}
            </p>
          )}
        </Section>

        {/* 3. Next steps */}
        <Section id="steps-h" title="Next steps">
          {tasks.length ? (
            <ul className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
              {tasks.map((t) => (
                <li key={t.key} className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t border-hairline px-4 py-4 first:border-t-0 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:px-5">
                  <span className={`grid size-8 place-items-center rounded-full ${TASK_STYLE[t.tone]}`}>
                    <Icon name={t.icon as IconName} size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{t.title}</span>
                    <span className="block text-sm text-ink-secondary">{t.detail}</span>
                  </span>
                  <span className="col-start-2 sm:col-start-auto">
                    <TaskAction action={t.action} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-secondary">You&apos;re all caught up.</p>
          )}
        </Section>

        {/* 4. Recommended */}
        {profile ? (
          <Section id="recs-h" title="Recommended for you" link={{ href: "/explore?mine=1&sort=match", label: "See all matches" }}>
            {recs.length ? (
              <ul className="flex flex-col gap-3">
                {recs.map((r) => (
                  <li key={r.id}>
                    <ScholarshipCard s={r} signedIn compact />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-secondary">
                No new matches right now. We&apos;ll alert you when one is posted. <Link href="/check?step=1">Update your answers</Link>
              </p>
            )}
          </Section>
        ) : null}

        {/* 5. Application progress */}
        <Section id="progress-h" title="My applications" link={{ href: "/applications", label: "Open tracker" }}>
          <dl className="grid grid-cols-2 overflow-hidden rounded-md border border-hairline bg-surface shadow-rest sm:grid-cols-4">
            {[
              ["Saved", String(progress.saved)],
              ["Preparing", String(progress.preparing)],
              ["Submitted", String(progress.submitted)],
              ["Documents ready", progress.docsTotal ? `${progress.docsDone} of ${progress.docsTotal}` : "None yet"],
            ].map(([label, value], i) => (
              <div key={label} className={`flex flex-col-reverse gap-1 border-hairline px-4 py-4 sm:px-5 ${i % 2 === 1 ? "border-l" : ""} ${i >= 2 ? "max-sm:border-t sm:border-l" : ""}`}>
                <dt className="text-sm text-ink-secondary">{label}</dt>
                <dd className="tnum text-title font-normal text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {/* 6. Announcements and alerts */}
        <Section id="news-h" title="Announcements and alerts" link={{ href: "/alerts", label: "All alerts" }}>
          {announcements.length || alerts.length ? (
            <ul className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
              {alerts.map((n) => (
                <li key={n.id} className="border-t border-hairline px-4 py-4 first:border-t-0 sm:px-5">
                  <p className="font-semibold text-ink">
                    {/* Plain <a>: opening marks the alert read, so it must never be prefetched. */}
                    <a href={`/alerts/${n.id}`} className="text-ink">{n.title}</a>
                  </p>
                  {n.body ? <p className="text-sm text-ink-secondary">{n.body}</p> : null}
                  <p className="mt-1 text-caption text-ink-hint">{ago(n.created_at)}</p>
                </li>
              ))}
              {announcements.map((a) => (
                <li key={a.id} className="border-t border-hairline px-4 py-4 first:border-t-0 sm:px-5">
                  <p className="flex items-center gap-2 font-semibold text-ink">
                    <Icon name="mega" size={16} className="text-ink-hint" />
                    {a.title}
                  </p>
                  <p className="mt-1 max-w-[70ch] text-sm text-ink-secondary">{a.body}</p>
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

        {/* 7. Profile completeness (compact) */}
        <section aria-labelledby="profile-h" className="rounded-md border border-hairline bg-surface-subtle px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="profile-h" className="text-sm font-semibold text-ink">
              Eligibility answers: {profileState.pct}% complete
            </h2>
            <Link href="/check?step=1" className="text-sm font-semibold">
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
  );
}
