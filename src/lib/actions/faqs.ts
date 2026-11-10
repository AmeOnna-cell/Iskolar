"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { parseKeywords } from "@/lib/faq";
import { createClient } from "@/lib/supabase/server";

export type FaqHit = { id: string; slug: string; question: string; snippet: string; answer: string };
export type FaqSearch = { ok: true; hits: FaqHit[] } | { ok: false; message: string };

/** Rule-based FAQ suggestions (search_faqs, docs/faq-search.md). Open to visitors; rate-limited in the database. */
export async function searchFaqs(query: string, limit = 3): Promise<FaqSearch> {
  const q = typeof query === "string" ? query.trim().slice(0, 200) : "";
  if (q.length < 3) return { ok: true, hits: [] };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_faqs", { p_query: q, p_limit: Math.min(Math.max(Math.trunc(limit) || 3, 1), 10) });
  if (error) {
    return { ok: false, message: error.code === "PT429" ? "Too many searches. Wait a minute and try again." : "Search isn't working right now. Try again." };
  }
  return { ok: true, hits: data.map(({ id, slug, question, snippet, answer }) => ({ id, slug, question, snippet, answer })) };
}

const faq = z.object({
  id: z.union([z.literal(""), z.uuid()]).optional(),
  question: z.string().trim().min(5, "Question: at least 5 characters.").max(200, "Question: 200 characters or fewer."),
  answer: z.string().trim().min(1, "Write the answer.").max(4000, "Answer: 4,000 characters or fewer."),
  keywords: z.string().max(1000, "Keywords: keep it under 1,000 characters.").optional(),
  scholarship_id: z.union([z.literal(""), z.uuid()]).optional(),
  intent: z.enum(["draft", "approved", "archived"]),
});

export type FaqState = { status: "idle" | "error"; message?: string; fieldErrors?: Record<string, string> };

const SAVED: Record<string, string> = { draft: "saved", approved: "approved", archived: "archived" };

/** Create or update an FAQ. Coordinators save drafts; admins also approve and archive (RLS enforces both). */
export async function saveFaq(_prev: FaqState, fd: FormData): Promise<FaqState> {
  const user = await requireRole("coordinator", "admin");
  const parsed = faq.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { status: "error", message: "Some fields need attention.", fieldErrors };
  }
  const { id, keywords, scholarship_id, intent, ...rest } = parsed.data;
  if (intent !== "draft" && user.role !== "admin") {
    return { status: "error", message: "Only an admin can approve or archive. Save it as a draft for an admin to review." };
  }
  const row = { ...rest, keywords: parseKeywords(keywords ?? ""), scholarship_id: scholarship_id || null, status: intent };
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("faqs").update(row).eq("id", id).select("id")
    : await supabase.from("faqs").insert(row).select("id");
  if (error || !data?.length) {
    if (error && error.code !== "42501") console.error(JSON.stringify({ event: "staff.save_faq_failed", code: error.code, message: error.message }));
    return { status: "error", message: user.role === "admin" ? "We couldn't save this FAQ. Try again." : "We couldn't save this FAQ. Coordinators can only edit drafts." };
  }
  revalidatePath("/help");
  revalidatePath("/staff/faqs");
  redirect(`/staff/faqs?status=${intent}&saved=${SAVED[intent]}`);
}
