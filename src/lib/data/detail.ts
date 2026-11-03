import "server-only";
import type { SessionUser } from "@/lib/auth/session";
import { todayPH } from "@/lib/format";
import { getScholarshipDetail, statusOf } from "./scholarships";
import { getApplicationFor, getEvaluation } from "./student";

/** Everything a detail view needs: cached public content + the viewer's own state (never cached). */
export async function loadDetail(slug: string, user: SessionUser | null) {
  const s = await getScholarshipDetail(slug);
  if (!s) return null;
  const isStudent = user?.role === "student";
  const [evaluation, app] = isStudent
    ? await Promise.all([getEvaluation(user.id, s.id), getApplicationFor(s.id)])
    : [null, null];
  return {
    s,
    state: statusOf(s, todayPH()),
    evaluation,
    application: app ? { stage: app.stage, checked: app.documents.map((d) => d.document_id) } : null,
    viewer: { signedIn: Boolean(user), isStudent },
  };
}
