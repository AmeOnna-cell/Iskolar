import Link from "next/link";
import { Icon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { actionLabel, entityLabel, parseAuditParams } from "@/lib/audit-params";
import { requireRole } from "@/lib/auth/session";
import { auditFacets, getStaffNames, listAudit } from "@/lib/data/staff";
import { withParams } from "@/lib/paging";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Audit log" };

type SP = Record<string, string | string[] | undefined>;
type Json = Record<string, unknown> | null;

const when = (ts: string) =>
  new Date(ts).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.length ? v.map(show).join(", ") : "None";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const field = (k: string) => k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Names for the listings and accounts the rows on this page point at, so the summary can say who or what. */
async function targetNames(rows: Array<{ entity_type: string; entity_id: string | null; before: unknown; after: unknown }>) {
  const scholarshipIds = new Set<string>();
  const userIds = new Set<string>();
  for (const r of rows) {
    const j = { ...((r.before as Json) ?? {}), ...((r.after as Json) ?? {}) };
    if (r.entity_type === "scholarship" && r.entity_id) scholarshipIds.add(r.entity_id);
    else if (r.entity_type === "user" && r.entity_id) userIds.add(r.entity_id);
    else if (typeof j.scholarship_id === "string") scholarshipIds.add(j.scholarship_id);
  }
  const supabase = await createClient();
  const [{ data: sch }, { data: people }] = await Promise.all([
    scholarshipIds.size ? supabase.from("scholarships").select("id, name").in("id", [...scholarshipIds]) : Promise.resolve({ data: [] }),
    userIds.size ? supabase.from("profiles").select("id, email").in("id", [...userIds]) : Promise.resolve({ data: [] }),
  ]);
  return {
    scholarships: new Map((sch ?? []).map((s) => [s.id, s.name])),
    people: new Map((people ?? []).map((p) => [p.id, p.email ?? "Deleted account"])),
  };
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireRole("admin");
  const sp = await searchParams;
  const q = parseAuditParams(sp);
  const [{ rows, hasMore }, facets] = await Promise.all([listAudit(q), auditFacets()]);
  const [names, targets] = await Promise.all([getStaffNames([...new Set(rows.map((r) => r.actor_id).filter(Boolean) as string[])]), targetNames(rows)]);
  const pathname = "/admin/audit";
  const last = rows.at(-1);
  const filters: SP = { ...sp };
  delete filters.before;
  const exportHref = withParams("/admin/audit/export", filters, {});

  const target = (r: (typeof rows)[number]) => {
    const j = { ...((r.before as Json) ?? {}), ...((r.after as Json) ?? {}) };
    const str = (v: unknown) => (typeof v === "string" && v ? v : null);
    if (r.entity_type === "user") return (r.entity_id && targets.people.get(r.entity_id)) ?? str(j.email);
    if (r.entity_type === "scholarship") return (r.entity_id && targets.scholarships.get(r.entity_id)) ?? str(j.name);
    return (typeof j.scholarship_id === "string" && targets.scholarships.get(j.scholarship_id)) || str(j.title) || str(j.name) || str(j.question);
  };

  return (
    <div className="page-container py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Audit log</h1>
          <p className="mt-2 text-ink-secondary">Every staff and admin change, newest first. Entries can&apos;t be edited or deleted.</p>
        </div>
        <a href={exportHref} className={buttonClass("outline")} download>
          Export CSV
        </a>
      </div>

      <form action={pathname} className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto]">
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          Done by (email)
          <input name="actor" defaultValue={q.actor} maxLength={120} placeholder="name@example.com" className={`${inputClass} border-hairline-strong`} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          Action
          <select name="action" defaultValue={q.action} className={`${inputClass} border-hairline-strong`}>
            <option value="">Any action</option>
            {facets.actions
              .map((a) => [a, actionLabel(a)] as const)
              .sort((x, y) => x[1].localeCompare(y[1]))
              .map(([a, label]) => (
                <option key={a} value={a}>{label}</option>
              ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          About
          <select name="entity" defaultValue={q.entity} className={`${inputClass} border-hairline-strong`}>
            <option value="">Anything</option>
            {facets.entities.map((e) => (
              <option key={e} value={e}>{entityLabel(e).replace(/^./, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          From
          <input type="date" name="from" defaultValue={q.from} className={`${inputClass} border-hairline-strong`} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          To
          <input type="date" name="to" defaultValue={q.to} className={`${inputClass} border-hairline-strong`} />
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className={buttonClass("outline")}>Apply</button>
          {q.actor || q.action || q.entity || q.from || q.to ? (
            <Link href={pathname} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold">Clear</Link>
          ) : null}
        </div>
      </form>

      <div className="mt-4 overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-ink-secondary">No entries match these filters.</p>
        ) : (
          <ul data-testid="audit-rows">
            {rows.map((r) => {
              const keys = [...new Set([...Object.keys((r.before as object) ?? {}), ...Object.keys((r.after as object) ?? {})])];
              const what = target(r);
              return (
                <li key={r.id} className="border-b border-hairline last:border-b-0">
                  <details className="group">
                    <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 px-4 py-3 hover:bg-surface-hover sm:grid-cols-[180px_minmax(0,1fr)_minmax(0,0.7fr)_auto] sm:items-center sm:gap-x-4 sm:px-5 [&::-webkit-details-marker]:hidden">
                      <span className="tnum text-caption text-ink-hint max-sm:order-2 max-sm:col-span-2">{when(r.created_at)}</span>
                      <span className="min-w-0 text-sm max-sm:order-1">
                        <span className="font-semibold text-ink">{actionLabel(r.action)}</span>
                        {what ? <span className="break-words text-ink-secondary"> · {what}</span> : null}
                      </span>
                      <span className="truncate text-sm text-ink-secondary max-sm:order-3 max-sm:col-span-2">
                        {r.actor_id ? names.get(r.actor_id) ?? "Unknown" : "System (setup or scheduled job)"}
                        {r.actor_id && r.actor_role ? ` (${r.actor_role})` : ""}
                      </span>
                      <Icon name="chevron" size={16} className="text-ink-hint transition-transform group-open:rotate-180 max-sm:order-1 motion-reduce:transition-none" />
                    </summary>
                    <div className="overflow-x-auto px-4 pb-4 sm:px-5">
                      <p className="mb-2 text-caption text-ink-hint">
                        <span className="font-mono">{r.action}</span> · {entityLabel(r.entity_type)} <span className="font-mono">{r.entity_id ?? "—"}</span>
                        {r.ip ? ` · IP ${r.ip}` : ""}
                      </p>
                      {keys.length ? (
                        <table className="w-full min-w-[480px] text-sm">
                          <thead>
                            <tr className="border-b border-hairline">
                              <th scope="col" className="py-2 pr-4 text-left text-caption font-normal text-ink-secondary">Field</th>
                              <th scope="col" className="py-2 pr-4 text-left text-caption font-normal text-ink-secondary">Before</th>
                              <th scope="col" className="py-2 text-left text-caption font-normal text-ink-secondary">After</th>
                            </tr>
                          </thead>
                          <tbody>
                            {keys.map((k) => (
                              <tr key={k} className="border-b border-hairline last:border-b-0 align-top">
                                <th scope="row" className="py-2 pr-4 text-left font-semibold text-ink">{field(k)}</th>
                                <td className="py-2 pr-4 break-all text-ink-secondary">{show((r.before as Json)?.[k])}</td>
                                <td className="py-2 break-all text-ink">{show((r.after as Json)?.[k])}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-sm text-ink-secondary">No field changes recorded.</p>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3 text-sm sm:px-5">
          {q.before ? (
            <Link href={withParams(pathname, filters, {})} className={buttonClass("outline", "sm")}>Newest</Link>
          ) : (
            <span className="text-ink-secondary">Newest entries</span>
          )}
          {hasMore && last ? (
            <Link href={withParams(pathname, sp, { before: `${last.created_at}|${last.id}` })} className={buttonClass("outline", "sm")}>
              Older entries
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
