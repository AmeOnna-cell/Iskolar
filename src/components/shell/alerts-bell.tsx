"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Icon, type IconName } from "@/components/icons";
import { markRead } from "@/lib/actions/notifications";
import { ago } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type Alert = { id: string; kind: "deadline" | "change" | "new" | "announce"; title: string; body: string; read_at: string | null; created_at: string };
const KIND_ICON: Record<Alert["kind"], IconName> = { deadline: "clock", change: "cal", new: "spark", announce: "mega" };
const SHOWN = 10;

/**
 * The header bell: a dropdown of the 10 most recent alerts (unread ones highlighted), "Mark all as
 * read", and "See all notifications". A full-width sheet on phones. The unread count starts from the
 * server and follows Realtime changes to the student's alerts.
 */
export function AlertsBell({ userId, initial }: { userId: string; initial: number }) {
  const [unread, setUnread] = useState(initial);
  const [live, setLive] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Alert[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => setUnread(initial), [initial]);

  const load = useCallback(async () => {
    const { data, error } = await createClient()
      .from("notifications")
      .select("id, kind, title, body, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(SHOWN);
    setFailed(Boolean(error));
    if (data) setItems(data as Alert[]);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    const recount = async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
      if (alive && count !== null) setUnread(count);
    };
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void (async () => {
      // Realtime applies RLS with the token it's given: hand it the student's session (read from the
      // auth cookie), or it would connect as anon and never see their rows.
      const { data } = await supabase.auth.getSession();
      if (!alive || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`alerts:${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
          void recount();
          void load(); // refresh the list in place
        })
        .subscribe((status) => {
          if (!alive) return;
          setLive(status === "SUBSCRIBED");
          // Anything that changed while (re)connecting.
          if (status === "SUBSCRIBED") void recount();
        });
    })();
    return () => {
      alive = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  useEffect(() => {
    if (open && items === null) void load();
  }, [open, items, load]);

  const markAll = () =>
    start(async () => {
      const res = await markRead(null);
      if (!res.ok) return setFailed(true);
      setUnread(0);
      setItems((list) => list?.map((a) => ({ ...a, read_at: a.read_at ?? new Date().toISOString() })) ?? null);
    });

  return (
    // Not modal: the rest of the page stays reachable (a modal menu aria-hides focusable content); Esc,
    // Tab out or a click outside close it.
    <Menu.Root open={open} onOpenChange={setOpen} modal={false}>
      <Menu.Trigger
        aria-label={unread ? `Alerts, ${unread} unread` : "Alerts"}
        title="Alerts"
        data-live={live ? "true" : undefined}
        className="relative grid size-11 place-items-center rounded-full text-ink-secondary hover:bg-surface-hover hover:text-ink data-[state=open]:bg-surface-hover data-[state=open]:text-ink"
      >
        <Icon name="bell" size={20} />
        {unread > 0 ? (
          <span
            data-testid="unread-badge"
            className="tnum absolute top-1 right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-surface bg-danger px-1 text-tab leading-none font-bold text-white"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={8}
          collisionPadding={0}
          // Phones: a full-width sheet under the header. Wider: a 400px panel under the bell.
          className="z-40 flex max-h-[min(600px,calc(100dvh-72px))] w-screen flex-col overflow-hidden border-y border-hairline bg-surface shadow-overlay sm:w-[400px] sm:rounded-md sm:border-x"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 py-1">
            <p className="text-title-sm font-[650] text-ink">
              Alerts{unread ? <span className="ml-2 text-sm font-normal text-ink-secondary">{unread} unread</span> : null}
            </p>
            {unread ? (
              <Menu.Item
                onSelect={(e) => {
                  e.preventDefault(); // stay open
                  markAll();
                }}
                disabled={pending}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-sm px-2 text-sm font-semibold text-primary outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-hover data-[highlighted]:outline-2 data-[highlighted]:-outline-offset-2 data-[highlighted]:outline-primary"
              >
                Mark all as read
              </Menu.Item>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
            {items === null && !failed ? (
              <p className="px-4 py-6 text-sm text-ink-secondary" role="status">Loading your alerts…</p>
            ) : failed && !items?.length ? (
              <p className="px-4 py-6 text-sm text-ink-secondary" role="status">We couldn&apos;t load your alerts. See them all below.</p>
            ) : !items?.length ? (
              <p className="px-4 py-6 text-sm text-ink-secondary">No alerts yet. Save a scholarship and we&apos;ll remind you before it closes.</p>
            ) : (
              items.map((a) => (
                <Menu.Item key={a.id} asChild>
                  {/* /alerts/[id] marks it read, then goes where it points. A plain <a>: never prefetched. */}
                  <a
                    href={`/alerts/${a.id}`}
                    className={`grid grid-cols-[20px_minmax(0,1fr)_8px] items-start gap-3 border-b border-hairline px-4 py-3 text-ink no-underline outline-none last:border-b-0 data-[highlighted]:outline-2 data-[highlighted]:-outline-offset-2 data-[highlighted]:outline-primary ${a.read_at ? "data-[highlighted]:bg-surface-hover" : "bg-primary-wash"}`}
                  >
                    <Icon name={KIND_ICON[a.kind]} size={18} className="mt-0.5 text-ink-secondary" />
                    <span className="min-w-0">
                      <span className={`block text-sm ${a.read_at ? "text-ink" : "font-semibold text-ink"}`}>{a.title}</span>
                      {a.body ? <span className="mt-0.5 line-clamp-2 block text-sm text-ink-secondary">{a.body}</span> : null}
                      <span className="mt-0.5 block text-caption text-ink-hint">
                        {ago(a.created_at)}
                        {a.read_at ? null : <span className="sr-only">, unread</span>}
                      </span>
                    </span>
                    {a.read_at ? <span /> : <span aria-hidden="true" className="mt-1.5 size-2 rounded-full bg-primary" />}
                  </a>
                </Menu.Item>
              ))
            )}
          </div>

          <div className="grid shrink-0 grid-cols-2 border-t border-hairline">
            <Menu.Item asChild>
              <Link href="/alerts" className="flex min-h-11 items-center justify-center px-4 text-sm font-semibold text-primary no-underline outline-none data-[highlighted]:bg-surface-hover data-[highlighted]:outline-2 data-[highlighted]:-outline-offset-2 data-[highlighted]:outline-primary">
                See all notifications
              </Link>
            </Menu.Item>
            <Menu.Item asChild>
              <Link href="/profile#reminders" className="flex min-h-11 items-center justify-center border-l border-hairline px-4 text-sm font-semibold text-ink-secondary no-underline outline-none data-[highlighted]:bg-surface-hover data-[highlighted]:outline-2 data-[highlighted]:-outline-offset-2 data-[highlighted]:outline-primary">
                Reminder settings
              </Link>
            </Menu.Item>
          </div>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
