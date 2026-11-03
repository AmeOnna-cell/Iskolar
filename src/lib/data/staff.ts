import "server-only";
import { escapeLike } from "@/lib/paging";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

export async function getStaffOverview() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_overview");
  if (error) throw new Error(`staff_overview failed: ${error.message}`);
  return data as { listings: number; published: number; open: number; in_review: number; unverified: number; closing_7: number; mine: number; open_inquiries: number };
}

// ---------- Listings ----------

export const LISTING_SORTS = ["closes_on", "updated_at", "name"] as const;
export type ListingQuery = {
  q: string;
  status: Enums["listing_status"] | null;
  verification: Enums["verification_status"] | null;
  mine: boolean;
  sort: (typeof LISTING_SORTS)[number];
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
};

export async function listListings(p: ListingQuery, userId: string) {
  const supabase = await createClient();
  let q = supabase
    .from("scholarships")
    .select(
      "id, slug, name, listing_status, verification, opens_on, closes_on, last_verified_at, updated_at, is_sample, assigned_coordinator_id, provider:providers ( name, short_name, abbr, color )",
      { count: "exact" },
    );
  if (p.q) q = q.ilike("name", `%${escapeLike(p.q)}%`);
  if (p.status) q = q.eq("listing_status", p.status);
  if (p.verification) q = q.eq("verification", p.verification);
  if (p.mine) q = q.eq("assigned_coordinator_id", userId);
  const from = (p.page - 1) * p.pageSize;
  const { data, count, error } = await q
    .order(p.sort, { ascending: p.dir === "asc", nullsFirst: false })
    .order("id")
    .range(from, from + p.pageSize - 1);
  if (error) throw new Error(`listings failed: ${error.message}`);
  return { rows: data ?? [], total: count ?? 0 };
}

export async function getStaffNames(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id, p.full_name || p.email || "Unknown"]));
}

export async function listCoordinators() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .in("role", ["coordinator", "admin"])
    .eq("status", "active")
    .order("full_name");
  return data ?? [];
}

export async function listProviders() {
  const supabase = await createClient();
  const { data } = await supabase.from("providers").select("id, name, abbr, color, type").order("name");
  return data ?? [];
}

const EDIT_SELECT = `
  id, slug, name, summary, amount_text, amount_num, opens_on, closes_on, location_label, source_label, source_url,
  duration, renewal, obligations, listing_status, verification, last_verified_at, assigned_coordinator_id, provider_id,
  is_sample, updated_at,
  criteria:scholarship_criteria ( income_max, gwa_max, year_levels, fields, regions, requires_ofw, requires_four_ps ),
  benefits:scholarship_benefits ( id, position, text ),
  documents:scholarship_documents ( id, position, name, where_to_get ),
  steps:scholarship_steps ( id, position, title, detail ),
  notes:scholarship_notes ( id, position, text )
`;

export async function getListingForEdit(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scholarships")
    .select(EDIT_SELECT)
    .eq("id", id)
    .order("position", { referencedTable: "scholarship_benefits" })
    .order("position", { referencedTable: "scholarship_documents" })
    .order("position", { referencedTable: "scholarship_steps" })
    .order("position", { referencedTable: "scholarship_notes" })
    .maybeSingle();
  if (error) throw new Error(`listing failed: ${error.message}`);
  return data;
}
export type EditableListing = NonNullable<Awaited<ReturnType<typeof getListingForEdit>>>;

export async function getDeadlineHistory(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deadline_changes")
    .select("id, old_closes_on, new_closes_on, old_opens_on, new_opens_on, changed_at, changed_by")
    .eq("scholarship_id", id)
    .order("changed_at", { ascending: false })
    .limit(10);
  return data ?? [];
}

// ---------- Questions ----------

export async function listInquiries(status: Enums["inquiry_status"], page: number, pageSize: number) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const { data, count, error } = await supabase
    .from("inquiries")
    .select("id, question, status, student_context, created_at, scholarship:scholarships ( name, slug ), replies:inquiry_replies ( id, body, created_at, author_id )", { count: "exact" })
    .eq("status", status)
    .order("created_at", { ascending: status === "open" })
    .order("created_at", { referencedTable: "inquiry_replies" })
    .range(from, from + pageSize - 1);
  if (error) throw new Error(`inquiries failed: ${error.message}`);
  return { rows: data ?? [], total: count ?? 0 };
}

export async function inquiryCounts() {
  const supabase = await createClient();
  const statuses = ["open", "answered", "closed"] as const;
  const counts = await Promise.all(
    statuses.map((s) => supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", s).then((r) => r.count ?? 0)),
  );
  return Object.fromEntries(statuses.map((s, i) => [s, counts[i]!])) as Record<(typeof statuses)[number], number>;
}

// ---------- Announcements ----------

export async function listAnnouncements(page: number, pageSize: number) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const { data, count, error } = await supabase
    .from("announcements")
    .select("id, title, body, posted_as, published_at, author_id, scholarship:scholarships ( id, name )", { count: "exact" })
    .order("published_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw new Error(`announcements failed: ${error.message}`);
  return { rows: data ?? [], total: count ?? 0 };
}

// ---------- Users (admin) ----------

export const USER_SORTS = ["created_at", "full_name", "email"] as const;
export type UserQuery = {
  q: string;
  role: Enums["app_role"] | null;
  status: Enums["account_status"] | null;
  sort: (typeof USER_SORTS)[number];
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
};

export async function listUsers(p: UserQuery) {
  const supabase = await createClient();
  let q = supabase.from("profiles").select("id, full_name, email, role, status, created_at, deactivated_at", { count: "exact" });
  if (p.q) {
    const like = `%${escapeLike(p.q)}%`.replace(/[,()]/g, " ");
    q = q.or(`full_name.ilike.${like},email.ilike.${like}`);
  }
  if (p.role) q = q.eq("role", p.role);
  if (p.status) q = q.eq("status", p.status);
  const from = (p.page - 1) * p.pageSize;
  const { data, count, error } = await q
    .order(p.sort, { ascending: p.dir === "asc", nullsFirst: false })
    .order("id")
    .range(from, from + p.pageSize - 1);
  if (error) throw new Error(`users failed: ${error.message}`);
  return { rows: data ?? [], total: count ?? 0 };
}

// ---------- Audit log (admin), keyset pagination on (created_at, id) ----------

export type AuditQuery = {
  actor: string;
  action: string;
  entity: string;
  from: string;
  to: string;
  before: { at: string; id: number } | null;
  pageSize: number;
};

export async function listAudit(p: AuditQuery) {
  const supabase = await createClient();
  let q = supabase.from("audit_logs").select("id, actor_id, actor_role, action, entity_type, entity_id, before, after, ip, created_at");
  if (p.actor) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", `%${escapeLike(p.actor)}%`)
      .limit(50);
    q = q.in("actor_id", (actors ?? []).map((a) => a.id).concat("00000000-0000-0000-0000-000000000000"));
  }
  if (p.action) q = q.eq("action", p.action);
  if (p.entity) q = q.eq("entity_type", p.entity);
  if (p.from) q = q.gte("created_at", `${p.from}T00:00:00+08:00`);
  if (p.to) q = q.lt("created_at", `${p.to}T24:00:00+08:00`);
  if (p.before) q = q.or(`created_at.lt.${p.before.at},and(created_at.eq.${p.before.at},id.lt.${p.before.id})`);
  const { data, error } = await q.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(p.pageSize + 1);
  if (error) throw new Error(`audit failed: ${error.message}`);
  const rows = data ?? [];
  return { rows: rows.slice(0, p.pageSize), hasMore: rows.length > p.pageSize };
}

// ponytail: filter options come from the newest 1,000 entries; switch to a `select distinct`
// RPC once the log is large enough for older action names to drop out of that window.
export async function auditFacets() {
  const supabase = await createClient();
  const [{ data: actions }, { data: entities }] = await Promise.all([
    supabase.from("audit_logs").select("action").order("action").limit(1000),
    supabase.from("audit_logs").select("entity_type").order("entity_type").limit(1000),
  ]);
  return {
    actions: [...new Set((actions ?? []).map((a) => a.action))],
    entities: [...new Set((entities ?? []).map((e) => e.entity_type))],
  };
}
