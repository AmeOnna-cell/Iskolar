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

// ---------- Plain-language labels (the raw code stays in the row details and the CSV) ----------

const ENTITY: Record<string, string> = {
  scholarship: "listing",
  scholarship_criteria: "listing requirements",
  scholarship_benefit: "benefit",
  scholarship_document: "document",
  scholarship_step: "how-to-apply step",
  scholarship_note: "requirement",
  provider: "provider",
  announcement: "announcement",
  inquiry: "question",
  inquiry_reply: "reply",
  user: "account",
};

const ACTION: Record<string, string> = {
  "scholarship.publish": "Published listing",
  "scholarship.unpublish": "Unpublished listing",
  "scholarship.archive": "Archived listing",
  "scholarship.submit_for_review": "Sent listing for verification",
  "scholarship.return_to_draft": "Moved listing back to draft",
  "scholarship.verify": "Verified listing",
  "scholarship.unverify": "Marked listing unverified",
  "scholarship.deadline_change": "Changed deadline",
  "user.role_change": "Changed role",
  "user.deactivate": "Deactivated account",
  "user.reactivate": "Reactivated account",
  "user.delete": "Deleted account data",
  "user.ban_and_sign_out": "Blocked sign-in and signed out",
  "user.unban": "Allowed sign-in again",
  "user.sign_out_after_role_change": "Signed out after role change",
  "user.auth_deleted": "Deleted sign-in account",
  "inquiry.status_change": "Changed question status",
};

const VERB: Record<string, string> = { create: "Added", update: "Edited", delete: "Removed" };

export const entityLabel = (entity: string) => ENTITY[entity] ?? entity.replace(/_/g, " ");

/** "scholarship.publish" → "Published listing"; "scholarship_document.update" → "Edited document"; unknown codes unchanged. */
export function actionLabel(action: string): string {
  if (ACTION[action]) return ACTION[action];
  const [entity, verb] = action.split(".");
  return entity && verb && VERB[verb] ? `${VERB[verb]} ${entityLabel(entity)}` : action;
}
