import { NextResponse, type NextRequest } from "next/server";
import { csvCell, parseAuditParams } from "@/lib/audit-params";
import { getSessionUser } from "@/lib/auth/session";
import { getStaffNames, listAudit } from "@/lib/data/staff";

const MAX_ROWS = 50_000;

/** CSV of the audit log for the current filters (admins only), walked with the same keyset cursor. */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.status !== "active" || user.role !== "admin") {
    return new NextResponse("Only an admin can export the audit log.", { status: 403 });
  }
  const sp = Object.fromEntries(request.nextUrl.searchParams);
  const q = parseAuditParams(sp, 1000);
  q.before = null;

  const lines = [["created_at", "actor", "actor_role", "action", "entity_type", "entity_id", "before", "after", "ip"].map(csvCell).join(",")];
  let count = 0;
  for (;;) {
    const { rows, hasMore } = await listAudit(q);
    const names = await getStaffNames([...new Set(rows.map((r) => r.actor_id).filter(Boolean) as string[])]);
    for (const r of rows) {
      lines.push(
        [r.created_at, r.actor_id ? names.get(r.actor_id) ?? r.actor_id : "system", r.actor_role, r.action, r.entity_type, r.entity_id, r.before, r.after, r.ip]
          .map(csvCell)
          .join(","),
      );
    }
    count += rows.length;
    const last = rows.at(-1);
    if (!hasMore || !last || count >= MAX_ROWS) break;
    q.before = { at: last.created_at, id: last.id };
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="iskolar-audit-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
