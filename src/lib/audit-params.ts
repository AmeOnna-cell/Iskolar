import type { AuditQuery } from "@/lib/data/staff";
import { one } from "@/lib/paging";

type SP = Record<string, string | string[] | undefined>;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validated audit filters from the URL. `before` is the keyset cursor "<created_at>|<id>". */
export function parseAuditParams(sp: SP, pageSize = 25): AuditQuery {
  const before = one(sp.before);
  let cursor: AuditQuery["before"] = null;
  if (before) {
    const [at, id] = before.split("|");
    if (at && !Number.isNaN(Date.parse(at)) && /^\d+$/.test(id ?? "")) cursor = { at: new Date(at).toISOString(), id: Number(id) };
  }
  const clean = (v: string | undefined, max: number) => (v ?? "").trim().slice(0, max).replace(/[^\w.@+\- ]/g, "");
  return {
    actor: clean(one(sp.actor), 120),
    action: clean(one(sp.action), 80),
    entity: clean(one(sp.entity), 60),
    from: DATE.test(one(sp.from) ?? "") ? one(sp.from)! : "",
    to: DATE.test(one(sp.to) ?? "") ? one(sp.to)! : "",
    before: cursor,
    pageSize,
  };
}

export function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
  // Quote everything; neutralise spreadsheet formulas (=, +, -, @ at the start).
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}
