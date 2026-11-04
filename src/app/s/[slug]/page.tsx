import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { DueText, ProviderMark } from "@/components/scholarship/bits";
import { DetailBody } from "@/components/scholarship/detail-body";
import { getSessionUser } from "@/lib/auth/session";
import { loadDetail } from "@/lib/data/detail";
import { getScholarshipDetail, parseSearchParams, searchScholarships } from "@/lib/data/scholarships";
import { getPreferences } from "@/lib/data/student";
import { formatDate, plural } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const s = await getScholarshipDetail((await params).slug);
  return s ? { title: s.name, description: s.summary } : { title: "Scholarship not found" };
}

export default async function ScholarshipPage({ params }: Params) {
  const { slug } = await params;
  const user = await getSessionUser();
  const data = await loadDetail(slug, user);
  if (!data) notFound();
  const { s, state, application } = data;

  const isStudent = user?.role === "student";
  const [similar, prefs, reminded] = await Promise.all([
    searchScholarships(parseSearchParams({ sort: "deadline" }), user).then(({ rows }) =>
      rows.filter((r) => r.id !== s.id && r.status !== "closed" && r.verdict !== "no").slice(0, 4),
    ),
    isStudent ? getPreferences(user.id) : null,
    // The daily reminder job's record for this deadline, if it has already run (RLS: own alerts only).
    isStudent && application
      ? createClient().then(async (c) => {
          const { data: n } = await c
            .from("notifications")
            .select("created_at")
            .like("dedupe_key", `deadline:${s.id}:${s.closes_on}:%`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          return n?.created_at ?? null;
        })
      : null,
  ]);
  const channelList = prefs ? ([prefs.email && "email", prefs.push && "push notifications", prefs.site && "on-site alerts"].filter(Boolean) as string[]) : [];
  const channels = channelList.length > 1 ? `${channelList.slice(0, -1).join(", ")} and ${channelList.at(-1)}` : channelList[0];
  // Reminder copy that matches what the 07:00 job will actually do (one reminder per lead time).
  let reminder: string;
  if (!isStudent) reminder = "";
  else if (!application || state.status !== "open" || !prefs) reminder = "Save this scholarship to get deadline reminders.";
  else if (!channels) reminder = "Your reminders are turned off.";
  else if (reminded) reminder = `We reminded you on ${formatDate(reminded.slice(0, 10))} by ${channels}.`;
  else if (state.days_left === 0) reminder = "It closes today.";
  else if ((state.days_left ?? 99) <= prefs.lead_days) reminder = `It closes in ${plural(state.days_left ?? 0, "day")}. You'll get a reminder by ${channels} at 7 AM.`;
  else reminder = `We'll remind you ${plural(prefs.lead_days, "day")} before the deadline by ${channels}.`;

  return (
    <div className="page-container py-6 sm:py-8">
      <Link href="/explore" className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold">
        <Icon name="back" size={16} /> All scholarships
      </Link>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
          <DetailBody {...data} />
        </article>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <section aria-labelledby="reminders-h" className="rounded-md border border-hairline bg-surface p-4 shadow-rest sm:p-6">
            <h2 id="reminders-h" className="text-base font-semibold text-ink">
              Reminders
            </h2>
            <p className="mt-2 text-sm text-ink-secondary" data-testid="reminder-copy">
              {isStudent ? (
                reminder
              ) : user ? (
                "Reminders are for student accounts."
              ) : (
                <>
                  <Link href="/signup">Create an account</Link> and save this scholarship to get deadline reminders.
                </>
              )}
            </p>
            {isStudent ? (
              <Link href="/settings#reminders" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold">
                Change reminder settings
              </Link>
            ) : null}
          </section>
          {similar.length ? (
            <section aria-labelledby="similar-h" className="rounded-md border border-hairline bg-surface p-4 shadow-rest sm:p-6">
              <h2 id="similar-h" className="text-base font-semibold text-ink">
                Similar scholarships
              </h2>
              <ul className="mt-2">
                {similar.map((x) => (
                  <li key={x.id} className="border-t border-hairline first:border-t-0">
                    <Link href={`/s/${x.slug}`} className="group flex gap-3 py-3 text-ink no-underline">
                      <ProviderMark abbr={x.provider_abbr} color={x.provider_color} size="sm" />
                      <span className="min-w-0">
                        <span className="block text-sm leading-snug font-semibold group-hover:underline">{x.name}</span>
                        <span className="block text-caption text-ink-secondary">{x.amount_text}</span>
                        <DueText s={x} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
