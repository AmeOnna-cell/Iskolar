import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Pagination, SortLinks } from "@/components/ui/table-bits";
import { requireRole } from "@/lib/auth/session";
import { listUsers, USER_SORTS, type UserQuery } from "@/lib/data/staff";
import { formatDate } from "@/lib/format";
import { one, parsePaging, pickSort } from "@/lib/paging";
import { UsersTable, type UserRow } from "./users-table";

export const metadata = { title: "Users" };

type SP = Record<string, string | string[] | undefined>;
const ROLES = ["student", "coordinator", "admin"] as const;
const STATUSES = ["active", "deactivated", "deleted"] as const;

export default async function UsersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await requireRole("admin");
  const sp = await searchParams;
  const { page, pageSize } = parsePaging(sp);
  const { sort, dir } = pickSort(sp, USER_SORTS, "created_at");
  const query: UserQuery = {
    q: (one(sp.q) ?? "").trim().slice(0, 100),
    role: ROLES.find((r) => r === one(sp.role)) ?? null,
    status: STATUSES.find((s) => s === one(sp.status)) ?? null,
    sort,
    dir: dir ?? (sort === "created_at" ? "desc" : "asc"),
    page,
    pageSize,
  };
  const { rows, total } = await listUsers(query);
  const tableRows: UserRow[] = rows.map((r) => ({
    id: r.id,
    name: r.full_name || (r.status === "deleted" ? "Deleted account" : "No name"),
    email: r.email ?? "—",
    role: r.role,
    status: r.status,
    joined: formatDate(r.created_at.slice(0, 10), true),
    isSelf: r.id === me.id,
  }));
  const pathname = "/admin/users";

  return (
    <div className="page-container py-8">
      <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Users</h1>
      <p className="mt-2 text-ink-secondary">
        Deactivated accounts can&apos;t sign in and are signed out everywhere right away. Every change here is in the <Link href="/admin/audit">audit log</Link>.
      </p>

      <form action={pathname} role="search" className="mt-6 flex flex-wrap items-end gap-2">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-sm font-semibold text-ink">
          Search
          <input name="q" defaultValue={query.q} placeholder="Name or email" maxLength={100} className={`${inputClass} border-hairline-strong`} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          Role
          <select name="role" defaultValue={query.role ?? ""} className={`${inputClass} border-hairline-strong`}>
            <option value="">Any role</option>
            <option value="student">Student</option>
            <option value="coordinator">Coordinator</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
          Status
          <select name="status" defaultValue={query.status ?? ""} className={`${inputClass} border-hairline-strong`}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
            <option value="deleted">Deleted</option>
          </select>
        </label>
        <input type="hidden" name="size" value={pageSize} />
        <button type="submit" className={buttonClass("outline")}>Apply</button>
        {query.q || query.role || query.status ? (
          <Link href={pathname} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold">Clear</Link>
        ) : null}
      </form>

      <div className="mt-4 overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
        <div className="border-b border-hairline px-4 py-2 text-caption text-ink-secondary sm:px-5">
          <SortLinks options={[["created_at", "Joined"], ["full_name", "Name"], ["email", "Email"]]} pathname={pathname} sp={sp} active={sort} dir={query.dir} />
        </div>
        {rows.length === 0 ? <p className="px-6 py-10 text-center text-ink-secondary">No accounts match.</p> : <UsersTable rows={tableRows} />}
        <Pagination pathname={pathname} sp={sp} page={page} pageSize={pageSize} total={total} />
      </div>
    </div>
  );
}
