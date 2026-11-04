import "server-only";
import { unstable_cache } from "next/cache";
import type { SessionUser } from "@/lib/auth/session";
import { isField, isProviderType, isRegion, type CourseField, type ProviderType, type Region } from "@/lib/reference";
import type { Database } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

/**
 * Caching (docs/caching.md): public, non-personalised data is cached with the `scholarships` tag
 * and revalidated by every staff mutation (revalidateTag). A signed-in student's search carries
 * their own verdicts, so it is never shared-cached.
 */
export const SCHOLARSHIPS_TAG = "scholarships";
const PUBLIC_TTL = 300;

export type SearchRow = Database["public"]["Functions"]["search_scholarships"]["Returns"][number];
export type Sort = "deadline" | "newest" | "amount" | "match";
export type StatusFilter = "open" | "upcoming" | "closed";

export type SearchParams = {
  q: string;
  status: StatusFilter | null;
  type: ProviderType | null;
  field: CourseField | null;
  region: Region | null;
  year: number | null;
  mine: boolean;
  sort: Sort;
  page: number;
  pageSize: number;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Validates URL search params into a search; anything unknown is dropped, never passed to SQL. */
export function parseSearchParams(sp: Record<string, string | string[] | undefined>): SearchParams {
  const status = one(sp.status);
  const sort = one(sp.sort);
  const year = Number(one(sp.year));
  const page = Number(one(sp.page));
  return {
    q: (one(sp.q) ?? "").trim().slice(0, 100),
    status: status === "open" || status === "upcoming" || status === "closed" ? status : null,
    type: isProviderType(one(sp.type)) ? (one(sp.type) as ProviderType) : null,
    field: isField(one(sp.field)) ? (one(sp.field) as CourseField) : null,
    region: isRegion(one(sp.region)) ? (one(sp.region) as Region) : null,
    year: Number.isInteger(year) && year >= 1 && year <= 6 ? year : null,
    mine: one(sp.mine) === "1",
    sort: sort === "newest" || sort === "amount" || sort === "match" ? sort : "deadline",
    page: Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1,
    pageSize: 10,
  };
}

/** The URL for a search (only non-default values), for links and router.replace. */
export function searchHref(p: Partial<SearchParams>, base = "/explore"): string {
  const u = new URLSearchParams();
  if (p.q) u.set("q", p.q);
  if (p.status) u.set("status", p.status);
  if (p.type) u.set("type", p.type);
  if (p.field) u.set("field", p.field);
  if (p.region) u.set("region", p.region);
  if (p.year) u.set("year", String(p.year));
  if (p.mine) u.set("mine", "1");
  if (p.sort && p.sort !== "deadline") u.set("sort", p.sort);
  if (p.page && p.page > 1) u.set("page", String(p.page));
  const s = u.toString();
  return s ? `${base}?${s}` : base;
}

type Client = ReturnType<typeof createPublicClient> | Awaited<ReturnType<typeof createClient>>;

async function runSearch(client: Client, p: SearchParams) {
  const { data, error } = await client.rpc("search_scholarships", {
    p_q: p.q || undefined,
    p_status: p.status ?? undefined,
    p_type: p.type ?? undefined,
    p_field: p.field ?? undefined,
    p_region: p.region ?? undefined,
    p_year: p.year ?? undefined,
    p_eligible_only: p.mine,
    p_sort: p.sort,
    p_page: p.page,
    p_page_size: p.pageSize,
  });
  if (error) throw new Error(`search_scholarships failed: ${error.message}`);
  const rows = data ?? [];
  return { rows, total: Number(rows[0]?.total_count ?? 0) };
}

const cachedPublicSearch = unstable_cache(
  async (key: string) => runSearch(createPublicClient(), JSON.parse(key) as SearchParams),
  ["search_scholarships"],
  { tags: [SCHOLARSHIPS_TAG], revalidate: PUBLIC_TTL },
);

export async function searchScholarships(p: SearchParams, user: SessionUser | null) {
  if (user?.role === "student") return runSearch(await createClient(), p);
  return cachedPublicSearch(JSON.stringify({ ...p, mine: false }));
}

// ---------- Landing ----------

export type ListingStats = { total: number; open: number; upcoming: number; verified: number; sample: number; by_type: Partial<Record<ProviderType, number>> };

export const getListingStats = unstable_cache(
  async (): Promise<ListingStats> => {
    const { data, error } = await createPublicClient().rpc("listing_stats");
    if (error) throw new Error(`listing_stats failed: ${error.message}`);
    return data as unknown as ListingStats;
  },
  ["listing_stats"],
  { tags: [SCHOLARSHIPS_TAG], revalidate: PUBLIC_TTL },
);

export const getProvidersWithListings = unstable_cache(
  async () => {
    const { data, error } = await createPublicClient()
      .from("providers")
      .select("id, name, short_name, abbr, color, scholarships!inner(id)")
      .eq("scholarships.listing_status", "published")
      .order("name");
    if (error) throw new Error(`providers failed: ${error.message}`);
    return (data ?? []).map((p) => ({ id: p.id, name: p.name, short_name: p.short_name, abbr: p.abbr, color: p.color }));
  },
  ["providers_with_listings"],
  { tags: [SCHOLARSHIPS_TAG], revalidate: PUBLIC_TTL },
);

/** Published scholarship names for pickers (the Help page's topic select). */
export const getScholarshipOptions = unstable_cache(
  async () => {
    const { data, error } = await createPublicClient().from("scholarships").select("id, name").eq("listing_status", "published").order("name");
    if (error) throw new Error(`scholarship options failed: ${error.message}`);
    return data ?? [];
  },
  ["scholarship_options"],
  { tags: [SCHOLARSHIPS_TAG], revalidate: PUBLIC_TTL },
);

// ---------- Detail ----------

const DETAIL_SELECT = `
  id, slug, name, summary, amount_text, opens_on, closes_on, location_label, source_label, source_url,
  duration, renewal, obligations, verification, last_verified_at, updated_at, published_at, is_sample,
  provider:providers ( name, short_name, abbr, color, type ),
  criteria:scholarship_criteria ( fields, year_levels, gwa_max, income_max, requires_four_ps, requires_ofw, regions ),
  benefits:scholarship_benefits ( position, text ),
  documents:scholarship_documents ( id, position, name, where_to_get ),
  steps:scholarship_steps ( position, title, detail ),
  notes:scholarship_notes ( position, text )
`;

async function fetchDetail(slug: string) {
  const { data, error } = await createPublicClient()
    .from("scholarships")
    .select(DETAIL_SELECT)
    .eq("slug", slug)
    .eq("listing_status", "published")
    .order("position", { referencedTable: "scholarship_benefits" })
    .order("position", { referencedTable: "scholarship_documents" })
    .order("position", { referencedTable: "scholarship_steps" })
    .order("position", { referencedTable: "scholarship_notes" })
    .maybeSingle();
  if (error) throw new Error(`scholarship detail failed: ${error.message}`);
  return data;
}

export const getScholarshipDetail = unstable_cache(fetchDetail, ["scholarship_detail"], {
  tags: [SCHOLARSHIPS_TAG],
  revalidate: PUBLIC_TTL,
});

export type ScholarshipDetail = NonNullable<Awaited<ReturnType<typeof fetchDetail>>>;

/** Open / upcoming / closed and days left, computed the same way as SQL (Philippine dates). */
export function statusOf(s: { opens_on: string | null; closes_on: string | null }, today: string) {
  const status = s.opens_on && today < s.opens_on ? "upcoming" : s.closes_on && today > s.closes_on ? "closed" : "open";
  const day = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  const days_left = s.closes_on ? Math.round((day(s.closes_on) - day(today)) / 86_400_000) : null;
  const days_to_open = s.opens_on ? Math.round((day(s.opens_on) - day(today)) / 86_400_000) : null;
  return { status, days_left, days_to_open } as const;
}
