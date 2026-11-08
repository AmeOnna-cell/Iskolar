import Link from "next/link";
import { DUE_TONE } from "@/components/scholarship/bits";
import { Pagination } from "@/components/ui/table-bits";
import { requireRole } from "@/lib/auth/session";
import { getPreferences, listNotifications, unreadCount } from "@/lib/data/notifications";
import { ago, daysBetween, todayPH, urgency } from "@/lib/format";
import { one, parsePaging } from "@/lib/paging";
import { AlertsList, type AlertRow } from "./alerts-list";

export const metadata = { title: "Alerts" };

type SP = Record<string, string | string[] | undefined>;

export default async function AlertsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireRole("student");
  const sp = await searchParams;
  const show = one(sp.show) === "unread" ? "unread" : "all";
  const { page, pageSize } = parsePaging(sp, { size: 25 });
  const [{ rows, total }, unread, prefs] = await Promise.all([listNotifications(show, page, pageSize), unreadCount(), getPreferences()]);
  const today = todayPH();
  const items: AlertRow[] = rows.map((r) => {
    const closes = (r.payload as { closes_on?: string } | null)?.closes_on;
    const left = r.kind === "deadline" && closes ? daysBetween(today, closes) : null;
    return {
      id: r.id, kind: r.kind, title: r.title, body: r.body, when: ago(r.created_at), unread: !r.read_at,
      tone: left !== null && left >= 0 ? DUE_TONE[urgency("open", left)] : null,
    };
  });
  const channels = [prefs.email && "email", prefs.push && "push", prefs.site && "on-site alerts"].filter(Boolean) as string[];
  const summary = channels.length
    ? `${channels.length > 1 ? `${channels.slice(0, -1).join(", ")} and ${channels.at(-1)}` : channels[0]}, ${prefs.lead_days === 1 ? "1 day" : `${prefs.lead_days} days`} before deadlines.`.replace(/^./, (c) => c.toUpperCase())
    : "Reminders are off. You won't hear about deadlines.";
  const pathname = "/alerts";
  const tabs = [
    ["all", "All", null],
    ["unread", "Unread", unread],
  ] as const;

  return (
    <div className="page-container py-6 sm:py-8">
      <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Alerts</h1>
      <p className="mt-2 text-ink-secondary">Deadlines, schedule changes, new scholarships and announcements.</p>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="alerts-h">
          <h2 id="alerts-h" className="sr-only">Your alerts</h2>
          <nav aria-label="Show" className="mb-4 flex gap-1 border-b border-hairline">
            {tabs.map(([key, label, count]) => (
              <Link
                key={key}
                href={key === "all" ? pathname : `${pathname}?show=unread`}
                aria-current={key === show ? "page" : undefined}
                className={`-mb-px flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold no-underline ${key === show ? "border-primary text-primary" : "border-transparent text-ink-secondary hover:text-ink"}`}
              >
                {label}
                {count !== null ? <span data-testid="unread-tab-count" className="tnum rounded-full border border-hairline bg-surface-subtle px-2 text-caption text-ink-secondary">{count}</span> : null}
              </Link>
            ))}
          </nav>
          <div className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
            {items.length ? (
              <AlertsList rows={items} unreadTotal={unread} />
            ) : (
              <div className="px-6 py-12 text-center">
                <h3 className="text-base font-semibold text-ink">{show === "unread" || total ? "You're all caught up" : "No alerts yet"}</h3>
                <p className="mt-1 text-sm text-ink-secondary">
                  {show === "unread" ? "No unread alerts." : "Save a scholarship and we'll remind you before it closes."}
                </p>
                {show === "all" ? (
                  <Link href="/explore" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold">Find scholarships</Link>
                ) : null}
              </div>
            )}
            {total > pageSize ? <Pagination pathname={pathname} sp={sp} page={page} pageSize={pageSize} total={total} /> : null}
          </div>
        </section>

        <section aria-labelledby="prefs-h" className="rounded-md border border-hairline bg-surface p-4 shadow-rest sm:p-6">
          <h2 id="prefs-h" className="text-title-sm font-[650] text-ink">Reminders</h2>
          <p className="mt-2 text-sm text-ink-secondary" data-testid="prefs-summary">{summary}</p>
          <Link href="/profile#reminders" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold">
            Change reminder settings
          </Link>
        </section>
      </div>
    </div>
  );
}
