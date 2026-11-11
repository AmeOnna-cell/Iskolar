import Link from "next/link";
import { DUE_TONE, Pill } from "@/components/scholarship/bits";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { requireRole } from "@/lib/auth/session";
import { statusOf } from "@/lib/data/scholarships";
import { faqDraftCount } from "@/lib/data/faqs";
import { getStaffNames, getStaffOverview, listInquiries, listListings } from "@/lib/data/staff";
import { ago, formatDate, plural, schoolDaysSince, todayPH, urgency } from "@/lib/format";

export const metadata = { title: "Scholarship office" };

const QUEUE = 3;

export default async function StaffHomePage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const { password } = await searchParams;
  const user = await requireRole("coordinator", "admin");
  const isAdmin = user.role === "admin";
  const today = todayPH();
  const in7 = new Date(Date.parse(`${today}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
  const [o, questions, closing, faqDrafts] = await Promise.all([
    getStaffOverview(),
    listInquiries("open", 1, QUEUE),
    // ponytail: 50 covers any realistic week of deadlines; the "See all" link shows the rest.
    listListings({ q: "", status: null, verification: null, mine: false, closing: { from: today, to: in7 }, sort: "closes_on", dir: "asc", page: 1, pageSize: 50 }, user.id),
    isAdmin ? faqDraftCount() : 0,
  ]);
  const names = await getStaffNames([...new Set(closing.rows.slice(0, QUEUE).map((r) => r.assigned_coordinator_id).filter(Boolean) as string[])]);
  const mineClosing = closing.rows.filter((r) => r.assigned_coordinator_id === user.id).length;

  // What needs doing, in this role's terms: admins verify; coordinators keep their own listings current.
  const parts = [
    isAdmin && o.unverified ? `${plural(o.unverified, "listing")} ${o.unverified === 1 ? "needs" : "need"} verification` : null,
    !isAdmin && mineClosing ? `${mineClosing} of your listings ${mineClosing === 1 ? "closes" : "close"} this week` : null,
    o.open_inquiries ? `${plural(o.open_inquiries, "question")} ${o.open_inquiries === 1 ? "is" : "are"} waiting for a reply` : null,
    faqDrafts ? `${plural(faqDrafts, "FAQ draft")} ${faqDrafts === 1 ? "is" : "are"} waiting for approval` : null,
  ].filter(Boolean);
  const finding = parts.length ? `${[parts.slice(0, -1).join(", "), parts.at(-1)].filter(Boolean).join(" and ")}.` : isAdmin ? "Everything is verified and every question has a reply." : "Every question has a reply.";

  const tiles: Array<[string, string, string, string]> = [
    ["Published listings", String(o.published), `${o.open} open now`, "/staff/listings?status=published"],
    isAdmin
      ? ["Need verification", String(o.unverified), `${o.in_review} sent for review`, "/staff/listings?verification=unverified"]
      : ["Assigned to you", String(o.mine), o.mine ? "You can edit these" : "None yet. Ask an admin.", "/staff/listings?mine=1"],
    ["Closing in 7 days", String(o.closing_7), "Consider an announcement", "/staff/listings?closing=7"],
    ["Questions waiting", String(o.open_inquiries), "Reply within 2 school days", "/staff/inquiries"],
  ];

  return (
    <div className="page-container py-8">
      {password === "updated" ? (
        <div className="mb-6">
          <Notice tone="ok">Your password is updated. Other devices were signed out.</Notice>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Scholarship office</h1>
          <p className="mt-2 text-base text-ink sm:text-title-sm sm:leading-normal" data-testid="staff-finding">
            {finding}
          </p>
          {faqDrafts ? (
            <Link href="/staff/faqs?status=draft" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold">
              Review FAQ drafts
            </Link>
          ) : null}
        </div>
        <ButtonLink href="/staff/listings/new">Add a listing</ButtonLink>
      </div>

      <ul aria-label="At a glance" className="mt-8 grid grid-cols-2 overflow-hidden rounded-md border border-hairline bg-surface shadow-rest lg:grid-cols-4">
        {tiles.map(([label, value, foot, href], i) => (
          <li key={label} className={`border-hairline ${i % 2 === 1 ? "border-l" : ""} ${i >= 2 ? "max-lg:border-t lg:border-l" : ""}`}>
            <Link href={href} className="flex h-full flex-col gap-1 px-5 py-5 text-ink no-underline hover:bg-surface-hover">
              <span className="text-sm text-ink-secondary">{label}</span>
              <span className="tnum text-headline-sm font-bold">{value}</span>
              <span className="text-caption text-ink-hint">{foot}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <section aria-labelledby="q-h" className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
          <div className="flex items-baseline justify-between gap-4 border-b border-hairline px-5 py-4">
            <h2 id="q-h" className="text-title-sm font-[650] text-ink">Waiting longest</h2>
            {o.open_inquiries > QUEUE ? (
              <Link href="/staff/inquiries" className="text-sm font-semibold">
                All {o.open_inquiries} questions
              </Link>
            ) : null}
          </div>
          {questions.rows.length === 0 ? (
            <p className="px-5 py-8 text-ink-secondary">No questions waiting. Every student has a reply.</p>
          ) : (
            <ul>
              {questions.rows.map((q) => {
                const waited = schoolDaysSince(q.created_at);
                return (
                  <li key={q.id} className="flex items-start gap-4 border-t border-hairline px-5 py-4 first:border-t-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{q.question}</p>
                      <p className="mt-1 text-caption text-ink-hint">
                        {q.scholarship ? q.scholarship.name : "General question"} · {ago(q.created_at)}
                      </p>
                      {waited >= 2 ? (
                        <p className="mt-2">
                          <Pill tone="warn" icon="warn">Waiting {waited} school days</Pill>
                        </p>
                      ) : null}
                    </div>
                    <Link href={`/staff/inquiries/${q.id}`} className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold">
                      Reply<span className="sr-only"> to “{q.question}”</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="c-h" className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
          <div className="flex items-baseline justify-between gap-4 border-b border-hairline px-5 py-4">
            <h2 id="c-h" className="text-title-sm font-[650] text-ink">Closing within 7 days</h2>
            {closing.total > QUEUE ? (
              <Link href="/staff/listings?closing=7" className="text-sm font-semibold">
                All {closing.total} listings
              </Link>
            ) : null}
          </div>
          {closing.rows.length === 0 ? (
            <p className="px-5 py-8 text-ink-secondary">No published listing closes in the next 7 days.</p>
          ) : (
            <ul>
              {closing.rows.slice(0, QUEUE).map((r) => {
                const st = statusOf(r, today);
                const canEdit = isAdmin || r.assigned_coordinator_id === user.id;
                return (
                  <li key={r.id} className="flex items-start gap-4 border-t border-hairline px-5 py-4 first:border-t-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{r.name}</p>
                      <p className="mt-1 text-caption text-ink-hint">
                        <span className={`tnum font-semibold ${DUE_TONE[urgency(st.status, st.days_left)]}`}>
                          Closes {r.closes_on ? formatDate(r.closes_on) : ""}
                          {st.days_left === 0 ? " (today)" : st.days_left === 1 ? " (tomorrow)" : ` (${st.days_left} days)`}
                        </span>{" "}
                        · {r.assigned_coordinator_id ? (r.assigned_coordinator_id === user.id ? "You" : names.get(r.assigned_coordinator_id) ?? "—") : "Unassigned"}
                      </p>
                    </div>
                    <Link href={`/staff/listings/${r.id}`} className={`inline-flex min-h-11 shrink-0 items-center text-sm font-semibold ${canEdit ? "" : "text-ink-secondary"}`}>
                      {canEdit ? "Edit" : "View"}
                      <span className="sr-only"> {r.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
