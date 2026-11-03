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
    id, slug, name, amount_text, opens_on, closes_on, renewal, verification,
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
    .select("id, title, body, posted_as, published_at")
    .order("published_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getRecentNotifications(limit = 4) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getMyInquiries() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inquiries")
    .select("id, question, status, created_at, scholarship:scholarships ( name ), replies:inquiry_replies ( id, body, created_at )")
    .order("created_at", { ascending: false });
  return data ?? [];
}
