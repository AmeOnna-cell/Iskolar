"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { SCHOLARSHIPS_TAG } from "@/lib/data/scholarships";
import { createClient } from "@/lib/supabase/server";
import { listingSchema, slugify, type ListingInput } from "@/lib/validation/listing";

export type BatchResult = { ok: boolean; message: string; results?: Array<{ id: string; ok: boolean; error: string | null }> };

const ADMIN_ACTIONS = new Set(["verify", "publish", "unpublish", "archive", "delete"]);
const ACTION_WORD: Record<string, string> = {
  verify: "verified",
  publish: "published",
  unpublish: "moved back to draft",
  archive: "archived",
  delete: "deleted",
  submit: "sent for verification",
};

function refreshListings() {
  revalidateTag(SCHOLARSHIPS_TAG);
  revalidatePath("/staff", "layout");
}

/** Batch listing action: one transaction, one audit row per item, per-row results. */
export async function batchListings(action: string, ids: string[]): Promise<BatchResult> {
  const user = await requireRole("coordinator", "admin");
  const parsed = z.object({ action: z.enum(["verify", "publish", "unpublish", "archive", "delete", "submit"]), ids: z.array(z.uuid()).min(1).max(200) }).safeParse({ action, ids });
  if (!parsed.success) return { ok: false, message: "Choose at least one listing." };
  if (ADMIN_ACTIONS.has(parsed.data.action) && user.role !== "admin") {
    return { ok: false, message: "Only an admin can do that. Send the listing for verification instead." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("batch_scholarships", { p_action: parsed.data.action, p_ids: parsed.data.ids });
  if (error) return { ok: false, message: "That didn't work. Refresh and try again." };
  refreshListings();
  const done = data.filter((r) => r.ok).length;
  const failed = data.length - done;
  return {
    ok: failed === 0,
    message: `${done} ${done === 1 ? "listing" : "listings"} ${ACTION_WORD[parsed.data.action]}${failed ? `, ${failed} not changed` : ""}.`,
    results: data,
  };
}

export type SaveListingState = { status: "idle" | "error"; message?: string; fieldErrors?: Record<string, string> };

/** Create or update a listing with all its parts (save_scholarship RPC, one transaction). */
export async function saveListing(input: ListingInput): Promise<SaveListingState & { id?: string }> {
  const user = await requireRole("coordinator", "admin");
  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] ??= i.message;
    return { status: "error", message: "Some fields need attention.", fieldErrors };
  }
  const v = parsed.data;
  const payload: Record<string, unknown> = {
    ...v,
    slug: slugify(v.slug || v.name) || `listing-${Date.now()}`,
    provider_id: v.provider_id || null,
    new_provider: v.provider_id ? undefined : v.new_provider,
  };
  // Only admins may (re)assign coordinators; for coordinators the key is left out entirely.
  if (user.role !== "admin") delete payload.assigned_coordinator_id;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_scholarship", { p: payload as never });
  if (error) {
    if (error.code === "23505") {
      return { status: "error", message: "That web address is already used by another listing. Change the slug.", fieldErrors: { slug: "Already in use." } };
    }
    if (error.code === "42501") return { status: "error", message: error.message };
    if (error.code === "23514") return { status: "error", message: "Check the dates and numbers: one of them isn't allowed." };
    console.error(JSON.stringify({ event: "staff.save_listing_failed", code: error.code, message: error.message }));
    return { status: "error", message: "We couldn't save this listing. Try again." };
  }
  refreshListings();
  return { status: "idle", id: data as string };
}

// ---------- Questions ----------

export async function replyInquiry(inquiryId: string, body: string): Promise<{ ok: boolean; message: string }> {
  await requireRole("coordinator", "admin");
  const parsed = z.object({ id: z.uuid(), body: z.string().trim().min(1, "Write a reply first.").max(4000, "Keep it under 4,000 characters.") }).safeParse({ id: inquiryId, body });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  const supabase = await createClient();
  const { error } = await supabase.from("inquiry_replies").insert({ inquiry_id: parsed.data.id, body: parsed.data.body });
  if (error) return { ok: false, message: "We couldn't send the reply. Try again." };
  revalidatePath("/staff/inquiries");
  return { ok: true, message: "Reply sent. The student sees it on the Help page." };
}

export async function setInquiryStatus(inquiryId: string, status: string): Promise<{ ok: boolean; message: string }> {
  await requireRole("coordinator", "admin");
  const parsed = z.object({ id: z.uuid(), status: z.enum(["open", "answered", "closed"]) }).safeParse({ id: inquiryId, status });
  if (!parsed.success) return { ok: false, message: "That didn't work." };
  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) return { ok: false, message: "We couldn't update the question." };
  revalidatePath("/staff/inquiries");
  return { ok: true, message: parsed.data.status === "closed" ? "Question closed" : "Question reopened" };
}

// ---------- Announcements ----------

const announcement = z.object({
  id: z.union([z.literal(""), z.uuid()]).optional(),
  title: z.string().trim().min(3, "Title: at least 3 characters.").max(140, "Title: 140 characters or fewer."),
  body: z.string().trim().min(1, "Write the message.").max(4000, "Message: 4,000 characters or fewer."),
  posted_as: z.string().trim().min(2, "Posted as: who students should see as the sender.").max(120),
  scholarship_id: z.union([z.literal(""), z.uuid()]).optional(),
});

export type AnnouncementState = { status: "idle" | "error" | "success"; message?: string; fieldErrors?: Record<string, string> };

export async function saveAnnouncement(_prev: AnnouncementState, fd: FormData): Promise<AnnouncementState> {
  await requireRole("coordinator", "admin");
  const parsed = announcement.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { status: "error", fieldErrors };
  }
  const { id, scholarship_id, ...rest } = parsed.data;
  const supabase = await createClient();
  const row = { ...rest, scholarship_id: scholarship_id || null };
  const { error } = id
    ? await supabase.from("announcements").update(row).eq("id", id)
    : await supabase.from("announcements").insert(row);
  if (error) return { status: "error", message: "We couldn't save the announcement. You can only edit your own." };
  revalidatePath("/staff/announcements");
  revalidatePath("/dashboard");
  return { status: "success", message: id ? "Announcement updated" : "Announcement posted. Students see it on their dashboard." };
}

export async function deleteAnnouncement(id: string): Promise<{ ok: boolean; message: string }> {
  await requireRole("coordinator", "admin");
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "That didn't work." };
  const supabase = await createClient();
  const { error, count } = await supabase.from("announcements").delete({ count: "exact" }).eq("id", id);
  if (error || !count) return { ok: false, message: "We couldn't delete it. You can only delete your own announcements." };
  revalidatePath("/staff/announcements");
  revalidatePath("/dashboard");
  return { ok: true, message: "Announcement deleted" };
}
