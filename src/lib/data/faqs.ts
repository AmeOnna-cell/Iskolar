import "server-only";
import { escapeLike } from "@/lib/paging";
import { createClient } from "@/lib/supabase/server";
import type { FaqStatus } from "@/lib/faq";

/** Approved FAQs for the Help page (RLS shows visitors and students approved ones only). */
export async function listApprovedFaqs() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("faqs").select("id, slug, question, answer").eq("status", "approved").order("created_at").order("id");
  if (error) throw new Error(`faqs failed: ${error.message}`);
  return data ?? [];
}

export async function listFaqs(p: { q: string; status: FaqStatus; page: number; pageSize: number }) {
  const supabase = await createClient();
  let q = supabase
    .from("faqs")
    .select("id, slug, question, answer, status, updated_at, created_by, scholarship:scholarships ( name )", { count: "exact" })
    .eq("status", p.status);
  if (p.q) {
    const like = `%${escapeLike(p.q)}%`.replace(/[,()]/g, " ");
    q = q.or(`question.ilike.${like},answer.ilike.${like}`);
  }
  const from = (p.page - 1) * p.pageSize;
  const { data, count, error } = await q.order("updated_at", { ascending: false }).order("id").range(from, from + p.pageSize - 1);
  if (error) throw new Error(`faqs failed: ${error.message}`);
  return { rows: data ?? [], total: count ?? 0 };
}

export async function faqCounts() {
  const supabase = await createClient();
  const statuses = ["draft", "approved", "archived"] as const;
  const counts = await Promise.all(
    statuses.map((s) => supabase.from("faqs").select("id", { count: "exact", head: true }).eq("status", s).then((r) => r.count ?? 0)),
  );
  return Object.fromEntries(statuses.map((s, i) => [s, counts[i]!])) as Record<FaqStatus, number>;
}

export async function getFaq(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("faqs")
    .select("id, slug, question, answer, keywords, scholarship_id, status, created_by, approved_by, approved_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/** A replied student question as a draft FAQ: the question, the latest reply, and its topic. */
export async function faqFromInquiry(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inquiries")
    .select("question, scholarship_id, replies:inquiry_replies ( body, created_at )")
    .eq("id", id)
    .order("created_at", { referencedTable: "inquiry_replies", ascending: false })
    .maybeSingle();
  if (!data?.replies.length) return null;
  return { question: data.question.slice(0, 200), answer: data.replies[0]!.body, scholarship_id: data.scholarship_id };
}
