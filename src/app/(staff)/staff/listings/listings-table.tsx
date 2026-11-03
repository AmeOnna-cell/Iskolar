"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pill, ProviderMark } from "@/components/scholarship/bits";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { batchListings, type BatchResult } from "@/lib/actions/staff";

export type ListingRow = {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "in_review" | "published" | "archived";
  verification: "verified" | "unverified";
  closes: string;
  urgency: "urgent" | "soon" | "none";
  checked: string;
  coordinator: string;
  provider: { name: string; abbr: string; color: string };
  canEdit: boolean;
  isSample: boolean;
};

const STATUS: Record<ListingRow["status"], [string, "neutral" | "info" | "ok" | "warn"]> = {
  draft: ["Draft", "neutral"],
  in_review: ["Sent for review", "info"],
  published: ["Published", "ok"],
  archived: ["Archived", "neutral"],
};

const ACTIONS = {
  admin: [
    ["verify", "Verify"],
    ["publish", "Publish"],
    ["unpublish", "Unpublish"],
    ["archive", "Archive"],
    ["delete", "Delete"],
  ],
  coordinator: [["submit", "Send for verification"]],
} as const;

export function ListingsTable({ rows, isAdmin }: { rows: ListingRow[]; isAdmin: boolean }) {
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<BatchResult | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const names = new Map(rows.map((r) => [r.id, r.name]));

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const run = (action: string) =>
    start(async () => {
      const res = await batchListings(action, [...selected]);
      toast(res.message, res.ok ? "ok" : "danger");
      setOutcome(res.ok ? null : res);
      if (res.ok) setSelected(new Set());
      else setSelected(new Set((res.results ?? []).filter((r) => !r.ok).map((r) => r.id)));
    });

  const actions = isAdmin ? ACTIONS.admin : ACTIONS.coordinator;

  return (
    <>
      {outcome?.results ? (
        <div role="alert" className="border-b border-hairline bg-warn-wash px-4 py-3 text-sm text-ink sm:px-5">
          <p className="font-semibold">{outcome.message}</p>
          <ul className="mt-1 list-disc pl-5">
            {outcome.results
              .filter((r) => !r.ok)
              .map((r) => (
                <li key={r.id}>
                  {names.get(r.id) ?? "A listing"}: {r.error}
                </li>
              ))}
          </ul>
        </div>
      ) : null}

      {/* Desktop table */}
      <div className="max-md:hidden">
        <table className="w-full text-sm">
          <caption className="sr-only">Scholarship listings</caption>
          <thead>
            <tr className="border-b border-hairline">
              <th scope="col" className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all listings on this page"
                  checked={allOnPage}
                  onChange={() => setSelected(allOnPage ? new Set() : new Set(rows.map((r) => r.id)))}
                  className="size-[18px] accent-[var(--primary)]"
                />
              </th>
              {["Scholarship", "Status", "Deadline", "Verification", "Coordinator", ""].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 text-left text-caption font-normal text-ink-secondary">
                  {h || <span className="sr-only">Actions</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-b border-hairline last:border-b-0 ${selected.has(r.id) ? "bg-primary-wash" : "hover:bg-surface-hover"}`}>
                <td className="px-4 py-3">
                  <input type="checkbox" aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="size-[18px] accent-[var(--primary)]" />
                </td>
                <td className="max-w-[340px] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ProviderMark abbr={r.provider.abbr} color={r.provider.color} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{r.name}</p>
                      <p className="truncate text-caption text-ink-secondary">{r.provider.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Pill tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Pill>
                </td>
                <td className={`tnum px-4 py-3 whitespace-nowrap ${r.urgency === "urgent" ? "font-semibold text-danger" : r.urgency === "soon" ? "font-semibold text-warn" : "text-ink"}`}>{r.closes}</td>
                <td className="px-4 py-3">
                  {r.verification === "verified" ? (
                    <span className="text-ink">
                      Verified <span className="text-ink-hint">· {r.checked}</span>
                    </span>
                  ) : (
                    <Pill tone="warn" icon="warn">Unverified</Pill>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-secondary">{r.coordinator}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {r.canEdit ? (
                    <Link href={`/staff/listings/${r.id}`} className="font-semibold">
                      Edit<span className="sr-only"> {r.name}</span>
                    </Link>
                  ) : (
                    <Link href={`/s/${r.slug}`} className="text-ink-secondary">
                      View<span className="sr-only"> {r.name}</span>
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: stacked cards */}
      <ul className="md:hidden">
        {rows.map((r) => (
          <li key={r.id} className={`flex gap-3 border-b border-hairline px-4 py-4 last:border-b-0 ${selected.has(r.id) ? "bg-primary-wash" : ""}`}>
            <label className="grid size-11 shrink-0 place-items-center">
              <input type="checkbox" aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="size-[18px] accent-[var(--primary)]" />
            </label>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{r.name}</p>
              <p className="text-caption text-ink-secondary">{r.provider.name}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Pill tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Pill>
                {r.verification === "verified" ? <Pill>Verified {r.checked}</Pill> : <Pill tone="warn" icon="warn">Unverified</Pill>}
              </div>
              <p className={`mt-2 text-caption ${r.urgency === "urgent" ? "font-semibold text-danger" : "text-ink-secondary"}`}>Deadline {r.closes} · {r.coordinator}</p>
            </div>
            {r.canEdit ? (
              <Link href={`/staff/listings/${r.id}`} className="self-center text-sm font-semibold">
                Edit<span className="sr-only"> {r.name}</span>
              </Link>
            ) : null}
          </li>
        ))}
      </ul>

      {/* Batch bar: inline on desktop, sticky above the tab bar on phones */}
      {selected.size > 0 ? (
        <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center gap-2 border-t border-hairline bg-surface px-4 py-3 shadow-overlay nav:bottom-0 sm:px-5" role="region" aria-label="Batch actions">
          <span className="mr-2 text-sm font-semibold text-ink">{selected.size} selected</span>
          {actions.map(([a, label]) =>
            a === "delete" ? (
              <Button key={a} variant="outline" size="sm" disabled={pending} onClick={() => setConfirmDelete(true)} className="text-danger">
                {label}
              </Button>
            ) : (
              <Button key={a} variant={a === "publish" || a === "submit" ? "primary" : "outline"} size="sm" loading={pending} onClick={() => run(a)}>
                {label}
              </Button>
            ),
          )}
          <Button variant="text" size="sm" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        </div>
      ) : null}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete} title={`Delete ${selected.size} ${selected.size === 1 ? "listing" : "listings"}?`} description="Students tracking them lose their checklists for these listings. Archive instead if you may need them again.">
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() => {
              setConfirmDelete(false);
              run("delete");
            }}
          >
            Delete permanently
          </Button>
        </div>
      </Dialog>
    </>
  );
}
