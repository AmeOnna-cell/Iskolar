import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { deliverPending } from "@/lib/notifications/deliver";

export const maxDuration = 60;

function authorized(header: string | null, secret: string) {
  const a = Buffer.from(header ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Called by pg_cron through pg_net (public.call_dispatch) with the shared CRON_SECRET. */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (!authorized(request.headers.get("authorization"), secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const summary = await deliverPending();
    console.log(JSON.stringify({ event: "notifications.dispatched", ...summary }));
    return NextResponse.json(summary);
  } catch (err) {
    console.error(JSON.stringify({ event: "notifications.dispatch_failed", message: (err as Error).message }));
    return NextResponse.json({ error: "Dispatch failed" }, { status: 500 });
  }
}
