"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { rateLimitAll } from "@/lib/auth/rate-limit";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; message: string };

const uuid = z.uuid();
const stage = z.enum(["saved", "preparing", "submitted"]);
const result = z.enum(["pending", "approved", "rejected"]);

function refresh() {
  revalidatePath("/s/[slug]", "page");
  revalidatePath("/dashboard");
  revalidatePath("/applications");
  revalidatePath("/explore");
}

const STAGE_TOAST: Record<z.infer<typeof stage>, string> = {
  saved: "Saved to My applications",
  preparing: "Moved to Preparing",
  submitted: "Marked as submitted",
};

/** Save, start preparing, or mark submitted. The student is always the session user. */
export async function setApplicationStage(scholarshipId: string, next: string): Promise<ActionResult> {
  const user = await requireRole("student");
  const sid = uuid.safeParse(scholarshipId);
  const st = stage.safeParse(next);
  if (!sid.success || !st.success) return { ok: false, message: "That didn't work. Refresh the page and try again." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .upsert({ student_id: user.id, scholarship_id: sid.data, stage: st.data }, { onConflict: "student_id,scholarship_id" });
  if (error) return { ok: false, message: "We couldn't update this. You can only track published scholarships." };
  refresh();
  return { ok: true, message: STAGE_TOAST[st.data] };
}

export async function removeApplication(scholarshipId: string): Promise<ActionResult> {
  await requireRole("student");
  const sid = uuid.safeParse(scholarshipId);
  if (!sid.success) return { ok: false, message: "That didn't work. Refresh the page and try again." };
  const supabase = await createClient();
  const { error } = await supabase.from("applications").delete().eq("scholarship_id", sid.data);
  if (error) return { ok: false, message: "We couldn't remove it. Try again." };
  refresh();
  return { ok: true, message: "Removed from My applications" };
}

export async function setApplicationResult(applicationId: string, value: string): Promise<ActionResult> {
  await requireRole("student");
  const id = uuid.safeParse(applicationId);
  const r = result.safeParse(value);
  if (!id.success || !r.success) return { ok: false, message: "That didn't work. Refresh the page and try again." };
  const supabase = await createClient();
  const { error } = await supabase.from("applications").update({ result: r.data }).eq("id", id.data).eq("stage", "submitted");
  if (error) return { ok: false, message: "We couldn't save the result. Try again." };
  refresh();
  return { ok: true, message: r.data === "pending" ? "Result cleared" : "Result saved" };
}

/**
 * Tick or untick a document. Ticking the first one starts preparing the scholarship (prototype:
 * "Ticking a document adds this scholarship to My applications").
 */
export async function toggleDocument(scholarshipId: string, documentId: string, checked: boolean): Promise<ActionResult & { added?: boolean }> {
  const user = await requireRole("student");
  const sid = uuid.safeParse(scholarshipId);
  const did = uuid.safeParse(documentId);
  if (!sid.success || !did.success) return { ok: false, message: "That didn't work. Refresh the page and try again." };
  const supabase = await createClient();

  let { data: app } = await supabase.from("applications").select("id, stage").eq("scholarship_id", sid.data).maybeSingle();
  let added = false;
  if (!app || app.stage === "saved") {
    const { data, error } = await supabase
      .from("applications")
      .upsert({ student_id: user.id, scholarship_id: sid.data, stage: "preparing" }, { onConflict: "student_id,scholarship_id" })
      .select("id, stage")
      .single();
    if (error) return { ok: false, message: "We couldn't save that. You can only track published scholarships." };
    added = !app;
    app = data;
  }

  const { error } = checked
    ? await supabase.from("application_documents").upsert({ application_id: app.id, document_id: did.data }, { ignoreDuplicates: true })
    : await supabase.from("application_documents").delete().eq("application_id", app.id).eq("document_id", did.data);
  if (error) return { ok: false, message: "We couldn't save that document. Try again." };
  refresh();
  return { ok: true, added, message: added ? "Added to My applications under Preparing" : checked ? "Marked as ready" : "Marked as not ready" };
}

// ---------- Questions to the scholarship office ----------

const question = z.object({
  question: z.string().trim().min(5, "Write a little more so the office can help (at least 5 characters).").max(2000, "Keep it under 2,000 characters."),
  scholarshipId: z.union([z.uuid(), z.literal("")]),
});

export type AskState = { status: "idle" | "error" | "success"; message?: string; fieldError?: string };

export async function askQuestion(_prev: AskState, fd: FormData): Promise<AskState> {
  const user = await requireRole("student");
  const parsed = question.safeParse({ question: fd.get("question") ?? "", scholarshipId: fd.get("scholarshipId") ?? "" });
  if (!parsed.success) return { status: "error", fieldError: parsed.error.issues[0]?.message };
  if (!(await rateLimitAll([[`inquiry:user:${user.id}`, 5, 3600]]))) {
    return { status: "error", message: "You've sent 5 questions in the last hour. Wait a while before sending more." };
  }
  const supabase = await createClient();
  const { data: sp } = await supabase.from("student_profiles").select("program, year_level").eq("user_id", user.id).maybeSingle();
  const context = [sp?.program, sp?.year_level ? `${sp.year_level}${["th", "st", "nd", "rd"][sp.year_level] ?? "th"} year` : null]
    .filter(Boolean)
    .join(", ");
  const { error } = await supabase.from("inquiries").insert({
    student_id: user.id,
    question: parsed.data.question,
    scholarship_id: parsed.data.scholarshipId || null,
    student_context: context || null,
  });
  if (error) return { status: "error", message: "We couldn't send your question. Try again." };
  revalidatePath("/help");
  return { status: "success", message: "Question sent. The office usually replies within 2 school days." };
}
