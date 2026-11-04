import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/routes";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Opening an alert: mark it read, then go where it points. Linked with a plain <a> (never prefetched). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const back = new URL("/alerts", request.url);
  const user = await getSessionUser();
  if (!user || user.status !== "active" || user.role !== "student") return NextResponse.redirect(new URL("/login?next=/alerts", request.url));
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(back);

  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("link").eq("id", id).maybeSingle();
  if (!data) return NextResponse.redirect(back);
  await supabase.rpc("mark_notifications_read", { p_ids: [id] });
  return NextResponse.redirect(new URL(safeNextPath(data.link, "/alerts"), request.url));
}
