import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { DueText, ProviderMark } from "@/components/scholarship/bits";
import { DetailBody } from "@/components/scholarship/detail-body";
import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { loadDetail } from "@/lib/data/detail";
import { getScholarshipDetail, parseSearchParams, searchScholarships } from "@/lib/data/scholarships";
import { getPreferences } from "@/lib/data/student";
import { plural } from "@/lib/format";

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

  const [similar, prefs] = await Promise.all([
    searchScholarships(parseSearchParams({ sort: "deadline" }), user).then(({ rows }) =>
      rows.filter((r) => r.id !== s.id && r.status !== "closed" && r.verdict !== "no").slice(0, 4),
    ),
    user?.role === "student" ? getPreferences(user.id) : null,
  ]);
  const channels = prefs ? [prefs.email && "email", prefs.push && "push notification", prefs.site && "on-site alert"].filter(Boolean) : [];

  return (
    <div className="page-container py-6 sm:py-8">
      <Link href="/explore" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold">
        <Icon name="back" size={16} /> Back to search results
      </Link>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
          <DetailBody {...data} />
        </article>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          <section aria-labelledby="reminders-h" className="rounded-md border border-hairline bg-surface p-5 shadow-rest">
            <h2 id="reminders-h" className="text-base font-semibold text-ink">
              Reminders
            </h2>
            <p className="mt-2 text-sm text-ink-secondary">
              {application && state.status === "open" && prefs
                ? `We'll remind you ${plural(prefs.lead_days, "day")} before the deadline by ${channels.join(", ") || "on-site alert"}.`
                : user?.role === "student"
                  ? "Save this scholarship to get deadline reminders."
                  : "Sign in and save this scholarship to get deadline reminders."}
            </p>
            {user?.role === "student" ? (
              <Link href="/settings/notifications" className="mt-3 inline-block text-sm font-semibold">
                Change reminder settings
              </Link>
            ) : !user ? (
              <ButtonLink href={`/signup`} variant="outline" size="sm" className="mt-3">
                Create an account
              </ButtonLink>
            ) : null}
          </section>
          {similar.length ? (
            <section aria-labelledby="similar-h" className="rounded-md border border-hairline bg-surface p-5 shadow-rest">
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
