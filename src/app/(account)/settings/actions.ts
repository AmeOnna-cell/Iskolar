"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/** Erases the student's own eligibility answers (RLS: own row only). Applications and alerts stay. */
export async function deleteMyAnswers(): Promise<{ ok: boolean; message: string }> {
  const user = await requireRole("student");
  const supabase = await createClient();
  const { error } = await supabase.from("student_profiles").delete().eq("user_id", user.id);
  if (error) return { ok: false, message: "We couldn't delete your answers. Try again." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Your eligibility answers are deleted." };
}
