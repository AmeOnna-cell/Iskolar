"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function markAnnouncementsRead(ids: string[]) {
  const user = await getSessionUser();
  if (user?.role !== "student" || user.status !== "active") return false;
  const parsed = z.array(z.uuid()).min(1).max(500).safeParse(ids);
  if (!parsed.success) return false;
  const client = await createClient();
  const { error } = await client.from("announcement_reads").upsert(
    [...new Set(parsed.data)].map((announcement_id) => ({ announcement_id, student_id: user.id })),
    { onConflict: "student_id,announcement_id", ignoreDuplicates: true },
  );
  if (error) return false;
  revalidatePath("/announcements");
  return true;
}
