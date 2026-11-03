"use client";

import { useState, useTransition } from "react";
import { Pill } from "@/components/scholarship/bits";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { deleteUser, setUserRole, setUsersStatus, type AdminResult } from "@/lib/actions/admin";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "student" | "coordinator" | "admin";
  status: "active" | "deactivated" | "deleted";
  joined: string;
  isSelf: boolean;
};

const STATUS_TONE = { active: "ok", deactivated: "warn", deleted: "neutral" } as const;

function RowActions({ u, onResult }: { u: UserRow; onResult: (r: AdminResult) => void }) {
  const [pending, start] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (u.status === "deleted") return <span className="text-caption text-ink-hint">Deleted</span>;
  if (u.isSelf) return <span className="text-caption text-ink-hint">This is you</span>;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <label className="sr-only" htmlFor={`role-${u.id}`}>Role for {u.email}</label>
      <select
        id={`role-${u.id}`}
        value={u.role}
        disabled={pending || u.status !== "active"}
        onChange={(e) => start(async () => onResult(await setUserRole(u.id, e.target.value)))}
        className="h-9 rounded-sm border border-hairline-strong bg-surface px-2 text-sm text-ink disabled:opacity-50"
      >
        <option value="student">Student</option>
        <option value="coordinator">Coordinator</option>
        <option value="admin">Admin</option>
      </select>
      <Button variant="outline" size="sm" loading={pending} onClick={() => start(async () => onResult(await setUsersStatus([u.id], u.status === "active" ? "deactivated" : "active")))}>
        {u.status === "active" ? "Deactivate" : "Reactivate"}
        <span className="sr-only"> {u.email}</span>
      </Button>
      <Button variant="outline" size="sm" className="text-danger" onClick={() => setDeleting(true)}>
        Delete<span className="sr-only"> {u.email}</span>
      </Button>
      <Dialog
        open={deleting}
        onOpenChange={(o) => {
          setDeleting(o);
          setTyped("");
          setError(null);
        }}
        title="Delete this account?"
        description="Their eligibility answers, applications and alerts are removed, and they can't sign in. Questions they asked stay, without their details. This can't be undone."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await deleteUser(u.id, typed);
              if (!res.ok) {
                setError(res.message);
                return;
              }
              setDeleting(false);
              onResult(res);
            });
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor={`confirm-${u.id}`} className="text-sm font-semibold text-ink">
              Type <span className="break-all">{u.email}</span> to confirm
            </label>
            <input
              id={`confirm-${u.id}`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `confirm-${u.id}-err` : undefined}
              className={`${inputClass} ${error ? "border-danger" : "border-hairline-strong"}`}
            />
            {error ? <p id={`confirm-${u.id}-err`} className="text-caption font-semibold text-danger">{error}</p> : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleting(false)}>Cancel</Button>
            <Button type="submit" variant="danger" loading={pending} disabled={typed.trim().toLowerCase() !== u.email.toLowerCase()}>
              Delete account
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export function UsersTable({ rows }: { rows: UserRow[] }) {
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [failures, setFailures] = useState<AdminResult | null>(null);
  const selectable = rows.filter((r) => !r.isSelf && r.status !== "deleted");
  const allOnPage = selectable.length > 0 && selectable.every((r) => selected.has(r.id));
  const emails = new Map(rows.map((r) => [r.id, r.email]));

  const onResult = (res: AdminResult) => {
    toast(res.message, res.ok ? "ok" : "danger");
    setFailures(res.ok ? null : res);
  };
  const bulk = (status: "active" | "deactivated") =>
    start(async () => {
      const res = await setUsersStatus([...selected], status);
      onResult(res);
      setSelected(new Set((res.results ?? []).filter((r) => !r.ok).map((r) => r.id)));
    });
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <>
      {failures ? (
        <div role="alert" className="border-b border-hairline bg-warn-wash px-4 py-3 text-sm text-ink sm:px-5">
          <p className="font-semibold">{failures.message}</p>
          {failures.results?.some((r) => !r.ok) ? (
            <ul className="mt-1 list-disc pl-5">
              {failures.results.filter((r) => !r.ok).map((r) => (
                <li key={r.id}>{emails.get(r.id) ?? "An account"}: {r.error}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <ul>
        <li className="flex items-center gap-3 border-b border-hairline px-4 py-2 text-caption text-ink-secondary sm:px-5">
          <input type="checkbox" aria-label="Select all accounts on this page" checked={allOnPage} disabled={!selectable.length} onChange={() => setSelected(allOnPage ? new Set() : new Set(selectable.map((r) => r.id)))} className="size-[18px] accent-[var(--primary)]" />
          Select all on this page
        </li>
        {rows.map((u) => (
          <li key={u.id} className={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 border-b border-hairline px-4 py-4 last:border-b-0 sm:px-5 lg:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,0.6fr)_auto] lg:items-center ${selected.has(u.id) ? "bg-primary-wash" : ""}`}>
            <input type="checkbox" aria-label={`Select ${u.email}`} checked={selected.has(u.id)} disabled={u.isSelf || u.status === "deleted"} onChange={() => toggle(u.id)} className="mt-1 size-[18px] accent-[var(--primary)] lg:mt-0" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{u.name}</p>
              <p className="truncate text-sm text-ink-secondary">{u.email}</p>
            </div>
            <div className="col-start-2 flex flex-wrap items-center gap-2 text-caption text-ink-hint lg:col-start-auto">
              <Pill tone={STATUS_TONE[u.status]}>{u.status === "active" ? "Active" : u.status === "deactivated" ? "Deactivated" : "Deleted"}</Pill>
              <span className="capitalize">{u.role}</span>
              <span>· joined {u.joined}</span>
            </div>
            <div className="col-start-2 lg:col-start-auto">
              <RowActions u={u} onResult={onResult} />
            </div>
          </li>
        ))}
      </ul>
      {selected.size > 0 ? (
        <div role="region" aria-label="Batch actions" className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center gap-2 border-t border-hairline bg-surface px-4 py-3 shadow-overlay nav:bottom-0 sm:px-5">
          <span className="mr-2 text-sm font-semibold text-ink">{selected.size} selected</span>
          <Button variant="outline" size="sm" loading={pending} onClick={() => bulk("deactivated")}>Deactivate</Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => bulk("active")}>Reactivate</Button>
          <Button variant="text" size="sm" onClick={() => setSelected(new Set())}>Clear selection</Button>
        </div>
      ) : null}
    </>
  );
}
