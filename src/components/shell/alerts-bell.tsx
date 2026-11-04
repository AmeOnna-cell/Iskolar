"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";

/** The header bell. Starts from the server's count, then follows Realtime changes to the student's alerts. */
export function AlertsBell({ userId, initial }: { userId: string; initial: number }) {
  const [unread, setUnread] = useState(initial);
  const [live, setLive] = useState(false);
  useEffect(() => setUnread(initial), [initial]);

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
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, recount)
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
  }, [userId]);

  return (
    <Link
      href="/alerts"
      aria-label={unread ? `Alerts, ${unread} unread` : "Alerts"}
      title="Alerts"
      data-live={live ? "true" : undefined}
      className="relative grid size-11 place-items-center rounded-full text-ink-secondary hover:bg-surface-hover hover:text-ink"
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
    </Link>
  );
}
