import "server-only";
import { shortProvider } from "@/lib/format";
import { createPublicClient } from "@/lib/supabase/public";

export const GENERAL = "general";

export type Announcement = { id: string; title: string; body: string; posted_as: string; published_at: string };
export type BoardEntry = {
  /** "general" or the scholarship's slug (the ?a= value). */
  key: string;
  name: string;
  provider: string | null;
  count: number;
  latest: string | null;
  scholarship: { slug: string; name: string; provider: string; opens_on: string | null; closes_on: string | null } | null;
  items: Announcement[];
};

/**
 * Every announcement, grouped: "General announcements" (not about one scholarship) first, then each
 * scholarship that has any, newest first. Public reads (RLS: anyone reads announcements; only
 * published scholarships are visible), so an announcement about a listing that isn't public is left out.
 * ponytail: reads every announcement in one query; page it per scholarship if the table grows past a few thousand.
 */
export async function getAnnouncementBoard(): Promise<BoardEntry[]> {
  const { data, error } = await createPublicClient()
    .from("announcements")
    .select("id, title, body, posted_as, published_at, scholarship_id, scholarship:scholarships ( slug, name, opens_on, closes_on, provider:providers ( name ) )")
    .order("published_at", { ascending: false });
  if (error) throw new Error(`announcements failed: ${error.message}`);

  const general: BoardEntry = { key: GENERAL, name: "General announcements", provider: null, count: 0, latest: null, scholarship: null, items: [] };
  const bySlug = new Map<string, BoardEntry>();
  for (const row of data ?? []) {
    const { scholarship, scholarship_id, ...a } = row;
    let entry: BoardEntry | undefined;
    if (!scholarship_id) entry = general;
    else if (scholarship) {
      entry = bySlug.get(scholarship.slug);
      if (!entry) {
        const provider = shortProvider(scholarship.provider?.name ?? "");
        entry = {
          key: scholarship.slug,
          name: scholarship.name,
          provider,
          count: 0,
          latest: null,
          scholarship: { slug: scholarship.slug, name: scholarship.name, provider, opens_on: scholarship.opens_on, closes_on: scholarship.closes_on },
          items: [],
        };
        bySlug.set(scholarship.slug, entry);
      }
    }
    if (!entry) continue; // about a listing that isn't public
    entry.items.push(a);
    entry.count += 1;
    entry.latest ??= a.published_at;
  }
  return [general, ...bySlug.values()];
}
