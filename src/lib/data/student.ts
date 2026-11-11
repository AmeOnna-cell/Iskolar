import "server-only";
import type { Evaluation } from "@/lib/eligibility";
import { createClient } from "@/lib/supabase/server";

// Per-user reads, always with the student's own session (RLS: own rows only). Never cached across users.

export async function getStudentProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("student_profiles").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

export async function getEvaluation(userId: string, scholarshipId: string): Promise<Evaluation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("evaluate_eligibility", { p_student: userId, p_scholarship: scholarshipId });
  if (error) throw new Error(`evaluate_eligibility failed: ${error.message}`);
  return (data as unknown as Evaluation) ?? null;
}

export async function getApplicationFor(scholarshipId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("id, stage, result, documents:application_documents ( document_id )")
    .eq("scholarship_id", scholarshipId)
    .maybeSingle();
  return data;
}

export async function getPreferences(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

const APPLICATION_SELECT = `
  id, stage, result, created_at, updated_at, submitted_at,
  checked:application_documents ( document_id ),
  scholarship:scholarships (
    id, slug, name, amount_text, opens_on, closes_on, renewal, verification, location_label,
    provider:providers ( name, short_name, abbr, color ),
    documents:scholarship_documents ( id, name, position )
  )
`;

export async function listApplications() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("applications").select(APPLICATION_SELECT).order("created_at");
  if (error) throw new Error(`applications failed: ${error.message}`);
  return (data ?? []).filter((a) => a.scholarship);
}

export async function countTrackedApplications() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("applications")
    .select("id, scholarships!inner(id)", { count: "exact", head: true });
  return count ?? 0;
}

export type ApplicationRow = Awaited<ReturnType<typeof listApplications>>[number];

export async function getEligibilityCounts(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("eligibility_counts", { p_student: userId });
  return data?.[0] ?? { yes: 0, maybe: 0, no: 0 };
}

export async function getRecentAnnouncements(limit = 3) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, posted_as, published_at, scholarship:scholarships ( slug )")
    .order("published_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getRecentNotifications(limit = 4) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, read_at, created_at")
    // Announcements are listed on the dashboard themselves; don't show them twice.
    .neq("kind", "announce")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

type InquiryStatus = "open" | "answered" | "closed";

export async function listMyInquiries(userId: string, status: InquiryStatus | undefined, page: number, size: number) {
  const supabase = await createClient();
  const statuses = ["open", "answered", "closed"] as const;
  const counts = await Promise.all(statuses.map(async (key) => {
    const { count, error } = await supabase.from("student_inquiry_threads").select("id", { count: "exact", head: true }).eq("student_id", userId).eq("status", key);
    if (error) throw error;
    return count ?? 0;
  }));
  const [open, answered, closed] = counts;
  const all = open + answered + closed;
  const totals = { all, open, answered, closed };
  const total = totals[status ?? "all"];
  const currentPage = Math.min(page, Math.max(1, Math.ceil(total / size)));
  const from = (currentPage - 1) * size;
  let query = supabase.from("student_inquiry_threads").select("id, status, created_at, scholarship_name").eq("student_id", userId);
  if (status) query = query.eq("status", status);
  const { data, error } = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, from + size - 1);
  if (error) throw error;
  return { rows: data ?? [], totals, total, page: currentPage };
}

export async function getMyInquiry(userId: string, id: string) {
  const supabase = await createClient();
  const { data: selected, error: lookupError } = await supabase.from("inquiries")
    .select("scholarship_id, scholarship:scholarships(name, slug)").eq("student_id", userId).eq("id", id).maybeSingle();
  if (lookupError) throw lookupError;
  if (!selected) return null;

  let query = supabase.from("inquiries")
    .select("id, question, status, created_at, replies:inquiry_replies(id, body, created_at, author_id)")
    .eq("student_id", userId);
  query = selected.scholarship_id ? query.eq("scholarship_id", selected.scholarship_id) : query.eq("id", id);
  const { data, error } = await query.order("created_at", { ascending: false }).order("id", { ascending: false });
  if (error) throw error;
  if (!data.length) return null;
  const pending = data.find((item) => item.status === "open");
  const answered = data.find((item) => item.status === "answered");
  const messages = data.flatMap((item) => [
    { id: item.id, body: item.question, created_at: item.created_at, author_id: userId },
    ...item.replies,
  ]).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  return {
    scholarship: selected.scholarship,
    scholarshipId: selected.scholarship_id,
    created_at: data[0].created_at,
    status: (pending ? "open" : answered ? "answered" : "closed") as InquiryStatus,
    replyTo: (pending ?? answered)?.id,
    messages,
  };
}
