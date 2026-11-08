"use client";

import { useState, useTransition } from "react";
import { Pill } from "@/components/scholarship/bits";
import { Button } from "@/components/ui/button";
import { CheckCell } from "@/components/ui/check-cell";
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
const ROLE_LABEL = { student: "Student", coordinator: "Coordinator", admin: "Admin" } as const;
const ROLES = Object.keys(ROLE_LABEL) as Array<UserRow["role"]>;
const ROLE_CAN: Record<UserRow["role"], string> = {
  student: "Uses the student side only: eligibility check, applications and alerts.",
  coordinator: "Edits listings assigned to them, replies to questions and posts announcements.",
  admin: "Everything a coordinator can do, plus verifying and publishing listings, managing accounts and reading the audit log.",
};
// Shared column template so status, role, joined and actions line up from row to row.
const COLS = "grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 lg:grid-cols-[auto_minmax(0,1fr)_7rem_7rem_7rem_19rem]";

/** Role changes sign the person out and change what they can do, so they're confirmed in a dialog. */
function RoleDialog({ u, open, onOpenChange, onResult }: { u: UserRow; open: boolean; onOpenChange: (o: boolean) => void; onResult: (r: AdminResult) => void }) {
  const [role, setRole] = useState<UserRow["role"]>(u.role);
  const [pending, start] = useTransition();
  const close = (o: boolean) => {
    onOpenChange(o);
    setRole(u.role);
  };
  return (
    <Dialog open={open} onOpenChange={close} title="Change role" description={<span className="break-all">{u.name} · {u.email}</span>}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await setUserRole(u.id, role);
            onResult(res);
            if (res.ok) close(false);
          });
        }}
        className="flex flex-col gap-4"
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold text-ink">New role</legend>
          {ROLES.map((r) => (
            <label key={r} className="flex cursor-pointer gap-3 rounded-sm border border-hairline px-3 py-3 has-[:checked]:border-primary has-[:checked]:bg-primary-wash">
              <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="mt-0.5 size-[18px] shrink-0 accent-[var(--primary)]" />
              <span>
                <span className="font-semibold text-ink">
                  {ROLE_LABEL[r]}
                  {r === u.role ? <span className="font-normal text-ink-hint"> (current)</span> : null}
                </span>
                <span className="block text-sm text-ink-secondary">{ROLE_CAN[r]}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {role !== u.role ? (
          <p className="text-sm text-ink">They&apos;ll be signed out everywhere and get the new role when they sign in again. This goes in the audit log.</p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={pending} disabled={role === u.role}>
            {role === u.role ? "Choose a new role" : `Make ${ROLE_LABEL[role].toLowerCase()}`}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function RowActions({ u, onResult, onDeactivated }: { u: UserRow; onResult: (r: AdminResult) => void; onDeactivated: (ids: string[]) => void }) {
  const [pending, start] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [changingRole, setChangingRole] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (u.status === "deleted") return <span className="text-caption text-ink-hint">Deleted</span>;
  if (u.isSelf) return <span className="text-caption text-ink-hint">This is you</span>;
  const active = u.status === "active";
  return (
    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
      {active ? (
        <Button variant="outline" size="sm" onClick={() => setChangingRole(true)}>
          Change role<span className="sr-only"> for {u.email}</span>
        </Button>
      ) : null}
      <RoleDialog u={u} open={changingRole} onOpenChange={setChangingRole} onResult={onResult} />
      <Button
        variant="outline"
        size="sm"
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await setUsersStatus([u.id], active ? "deactivated" : "active");
            if (active && res.ok) onDeactivated([u.id]);
            else onResult(res);
          })
        }
      >
        {active ? "Deactivate" : "Reactivate"}
        <span className="sr-only"> {u.email}</span>
      </Button>
      <Button variant="outline-danger" size="sm" onClick={() => setDeleting(true)}>
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
  // Deactivating is reversible, so it runs at once and is offered back as Undo instead of asking first.
  const onDeactivated = (ids: string[]) => {
    setFailures(null);
    const who = ids.length === 1 ? (emails.get(ids[0]!) ?? "Account") : `${ids.length} accounts`;
    toast(`${who} deactivated and signed out.`, "ok", {
      label: "Undo",
      run: () => start(async () => onResult(await setUsersStatus(ids, "active"))),
    });
  };
  const bulk = (status: "active" | "deactivated") =>
    start(async () => {
      const res = await setUsersStatus([...selected], status);
      const changed = (res.results ?? []).filter((r) => r.ok).map((r) => r.id);
      if (status === "deactivated" && res.ok && changed.length) onDeactivated(changed);
      else onResult(res);
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
        <li className={`${COLS} items-center border-b border-hairline px-4 py-1 text-caption text-ink-secondary sm:px-5`}>
          <CheckCell label="Select all accounts on this page" checked={allOnPage} disabled={!selectable.length} onChange={() => setSelected(allOnPage ? new Set() : new Set(selectable.map((r) => r.id)))} />
          <span>
            <span className="lg:hidden">Select all on this page</span>
            <span className="max-lg:hidden">Name and email</span>
          </span>
          <span className="max-lg:hidden">Status</span>
          <span className="max-lg:hidden">Role</span>
          <span className="max-lg:hidden">Joined</span>
          <span className="max-lg:hidden" />
        </li>
        {rows.map((u) => (
          <li key={u.id} className={`${COLS} items-start gap-y-2 border-b border-hairline px-4 py-4 last:border-b-0 sm:px-5 lg:items-center ${selected.has(u.id) ? "bg-primary-wash" : ""}`}>
            <CheckCell label={`Select ${u.email}`} checked={selected.has(u.id)} disabled={u.isSelf || u.status === "deleted"} onChange={() => toggle(u.id)} />
            <div className="min-w-0">
              <p className="font-semibold text-ink lg:truncate">{u.name}</p>
              <p className="text-sm break-all text-ink-secondary">{u.email}</p>
            </div>
            <div className="col-start-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-secondary lg:contents">
              <span>
                <Pill tone={STATUS_TONE[u.status]}>{u.status === "active" ? "Active" : u.status === "deactivated" ? "Deactivated" : "Deleted"}</Pill>
              </span>
              <span className="text-ink lg:text-sm">{ROLE_LABEL[u.role]}</span>
              <span className="tnum">
                <span className="lg:hidden">· joined </span>
                {u.joined}
              </span>
            </div>
            <div className="col-start-2 lg:col-start-auto">
              <RowActions u={u} onResult={onResult} onDeactivated={onDeactivated} />
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
