import Link from "next/link";
import { PreferencesForm } from "@/components/notifications/preferences-form";
import { Pagination } from "@/components/ui/table-bits";
import { requireRole } from "@/lib/auth/session";
import { getPreferences, listNotifications, unreadCount } from "@/lib/data/notifications";
import { ago } from "@/lib/format";
import { one, parsePaging } from "@/lib/paging";
import { AlertsList, type AlertRow } from "./alerts-list";

export const metadata = { title: "Alerts" };

type SP = Record<string, string | string[] | undefined>;

export default async function AlertsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireRole("student");
  const sp = await searchParams;
  const show = one(sp.show) === "unread" ? "unread" : "all";
  const { page, pageSize } = parsePaging(sp, { size: 25 });
  const [{ rows, total }, unread, prefs] = await Promise.all([listNotifications(show, page, pageSize), unreadCount(), getPreferences()]);
  const items: AlertRow[] = rows.map((r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, when: ago(r.created_at), unread: !r.read_at }));
  const pathname = "/alerts";
  const tabs = [
    ["all", "All", null],
    ["unread", "Unread", unread],
  ] as const;

  return (
    <div className="page-container py-8">
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
                {count !== null ? <span data-testid="unread-tab-count" className="tnum rounded-full border border-hairline bg-surface-subtle px-2 text-tab text-ink-secondary">{count}</span> : null}
              </Link>
            ))}
          </nav>
          <div className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
            {items.length ? (
              <AlertsList rows={items} unreadTotal={unread} />
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="font-semibold text-ink">You&apos;re all caught up</p>
                <p className="mt-1 text-sm text-ink-secondary">
                  {show === "unread" ? "No unread alerts." : "Save a scholarship and we'll remind you before it closes."}
                </p>
                {show === "all" ? (
                  <Link href="/explore" className="mt-3 inline-block text-sm font-semibold">Find scholarships</Link>
                ) : null}
              </div>
            )}
            {total > pageSize ? <Pagination pathname={pathname} sp={sp} page={page} pageSize={pageSize} total={total} /> : null}
          </div>
        </section>

        <section aria-labelledby="prefs-h" className="rounded-md border border-hairline bg-surface p-5 shadow-rest">
          <h2 id="prefs-h" className="mb-4 text-title-sm font-semibold text-ink">Reminder settings</h2>
          <PreferencesForm prefs={prefs} email={user.email} />
        </section>
      </div>
    </div>
  );
}
