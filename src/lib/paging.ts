// URL-synced table state (?page=&size=&sort=&dir=&q=…) shared by every staff/admin table.

export const PAGE_SIZES = [10, 25, 50] as const;

type SP = Record<string, string | string[] | undefined>;
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parsePaging(sp: SP, defaults: { size?: number } = {}) {
  const page = Number(one(sp.page));
  const size = Number(one(sp.size));
  const pageSize = (PAGE_SIZES as readonly number[]).includes(size) ? size : (defaults.size ?? 25);
  return { page: Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1, pageSize };
}

export function pickSort<T extends string>(sp: SP, allowed: readonly T[], fallback: T): { sort: T; dir: "asc" | "desc" | null } {
  const sort = one(sp.sort) as T;
  const raw = one(sp.dir);
  const dir = raw === "asc" || raw === "desc" ? raw : null;
  return { sort: allowed.includes(sort) ? sort : fallback, dir };
}

/** Rebuilds the current URL with some params changed (null removes). */
export function withParams(pathname: string, sp: SP, patch: Record<string, string | number | null | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const val = one(v);
    if (val !== undefined && val !== "") u.set(k, val);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === "") u.delete(k);
    else u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `${pathname}?${s}` : pathname;
}

/** `%` and `_` are wildcards in ILIKE; escape them so a search for "50%" is literal. */
export const escapeLike = (q: string) => q.replace(/[\\%_]/g, (c) => `\\${c}`);
