import "server-only";
import { shortProvider } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";

export const GENERAL = "general";

export type Announcement = { id: string; author_id: string | null; title: string; body: string; posted_as: string; published_at: string };
export type BoardEntry = {
  /** "general" or the scholarship's slug (the ?a= value). */
  key: string;
  name: string;
  provider: string | null;
  count: number;
  latest: string | null;
  scholarship: { id: string; slug: string; name: string; provider: string; opens_on: string | null; closes_on: string | null } | null;
  items: Announcement[];
};

async function readAll<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const size = 500;
  const rows: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await read(from, from + size - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) return rows;
    rows.push(...data);
    if (data.length < size) return rows;
  }
}

/** Published scholarships and their announcements, with a separate general feed. */
export async function getAnnouncementBoard(): Promise<BoardEntry[]> {
  const client = createPublicClient();
  const [announcements, listings] = await Promise.all([
    readAll((from, to) => client.from("announcements")
      .select("id, author_id, title, body, posted_as, published_at, scholarship_id, scholarship:scholarships ( slug )")
      .order("published_at", { ascending: false }).order("id").range(from, to)),
    readAll((from, to) => client.from("scholarships").select("id, slug, name, opens_on, closes_on, provider:providers(name)")
      .eq("listing_status", "published").order("name").order("slug").range(from, to)),
  ]);
  const general: BoardEntry = { key: GENERAL, name: "General announcements", provider: null, count: 0, latest: null, scholarship: null, items: [] };
  const bySlug = new Map<string, BoardEntry>();
  for (const scholarship of listings) {
    const provider = shortProvider(scholarship.provider?.name ?? "");
    bySlug.set(scholarship.slug, {
      key: scholarship.slug, name: scholarship.name, provider, count: 0, latest: null,
      scholarship: { id: scholarship.id, slug: scholarship.slug, name: scholarship.name, provider, opens_on: scholarship.opens_on, closes_on: scholarship.closes_on },
      items: [],
    });
  }
  for (const row of announcements) {
    const { scholarship, scholarship_id, ...a } = row;
    let entry: BoardEntry | undefined;
    if (!scholarship_id) entry = general;
    else if (scholarship) entry = bySlug.get(scholarship.slug);
    if (!entry) continue; // about a listing that isn't public
    entry.items.push(a);
    entry.count += 1;
    entry.latest ??= a.published_at;
  }
  return [general, ...bySlug.values()];
}


export async function getAnnouncementReads(studentId: string) {
  const client = await createClient();
  const rows = await readAll((from, to) => client.from("announcement_reads").select("announcement_id")
    .eq("student_id", studentId).order("announcement_id").range(from, to));
  return new Set(rows.map((row) => row.announcement_id));
}
