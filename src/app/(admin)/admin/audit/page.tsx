import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { parseAuditParams } from "@/lib/audit-params";
import { requireRole } from "@/lib/auth/session";
import { auditFacets, getStaffNames, listAudit } from "@/lib/data/staff";
import { withParams } from "@/lib/paging";

export const metadata = { title: "Audit log" };

type SP = Record<string, string | string[] | undefined>;

const when = (ts: string) =>
  new Date(ts).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function show(v: unknown) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireRole("admin");
  const sp = await searchParams;
  const q = parseAuditParams(sp);
  const [{ rows, hasMore }, facets] = await Promise.all([listAudit(q), auditFacets()]);
  const names = await getStaffNames([...new Set(rows.map((r) => r.actor_id).filter(Boolean) as string[])]);
  const pathname = "/admin/audit";
  const last = rows.at(-1);
  const filters: SP = { ...sp };
  delete filters.before;
  const exportHref = withParams("/admin/audit/export", filters, {});

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
          Actor email
          <input name="actor" defaultValue={q.actor} maxLength={120} placeholder="name@school.edu.ph" className={`${inputClass} border-hairline-strong`} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          Action
          <select name="action" defaultValue={q.action} className={`${inputClass} border-hairline-strong`}>
            <option value="">Any action</option>
            {facets.actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          Entity
          <select name="entity" defaultValue={q.entity} className={`${inputClass} border-hairline-strong`}>
            <option value="">Anything</option>
            {facets.entities.map((e) => (
              <option key={e} value={e}>{e}</option>
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
              return (
                <li key={r.id} className="border-b border-hairline px-4 py-3 last:border-b-0 sm:px-5">
                  <details>
                    <summary className="grid cursor-pointer list-none grid-cols-1 gap-1 py-1 sm:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-4 [&::-webkit-details-marker]:hidden">
                      <span className="tnum text-caption text-ink-hint">{when(r.created_at)}</span>
                      <span className="min-w-0 text-sm">
                        <span className="font-semibold text-ink">{r.action}</span>
                        <span className="text-ink-secondary"> · {r.entity_type}</span>
                      </span>
                      <span className="truncate text-sm text-ink-secondary">
                        {r.actor_id ? names.get(r.actor_id) ?? "Unknown" : "System"}
                        {r.actor_role ? ` (${r.actor_role})` : ""}
                      </span>
                    </summary>
                    <div className="mt-3 overflow-x-auto">
                      <p className="mb-2 text-caption text-ink-hint">
                        Entity id <span className="font-mono">{r.entity_id ?? "—"}</span>
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
                                <td className="py-2 pr-4 font-semibold text-ink">{k}</td>
                                <td className="py-2 pr-4 break-all text-danger">{show((r.before as Record<string, unknown> | null)?.[k])}</td>
                                <td className="py-2 break-all text-ok">{show((r.after as Record<string, unknown> | null)?.[k])}</td>
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
