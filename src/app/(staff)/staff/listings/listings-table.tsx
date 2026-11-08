"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Pill, ProviderMark, SamplePill } from "@/components/scholarship/bits";
import { Button } from "@/components/ui/button";
import { CheckCell } from "@/components/ui/check-cell";
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

const DUE = { urgent: "font-semibold text-danger", soon: "font-semibold text-warn", none: "" } as const;

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

type Confirm = null | "publish" | "unpublish" | "delete";

/** Sample rows are never shown as verified (DESIGN.md). */
function Trust({ r, compact = false }: { r: ListingRow; compact?: boolean }) {
  if (r.isSample) return <SamplePill />;
  if (r.verification === "unverified") return <Pill tone="warn" icon="warn">Unverified</Pill>;
  return compact ? (
    <Pill>Verified {r.checked}</Pill>
  ) : (
    <span className="text-ink">
      Verified <span className="text-ink-hint">· {r.checked}</span>
    </span>
  );
}

export function ListingsTable({ rows, isAdmin }: { rows: ListingRow[]; isAdmin: boolean }) {
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<BatchResult | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const names = new Map(rows.map((r) => [r.id, r.name]));
  // Coordinators can only send their own drafts, so other rows aren't selectable for them.
  const selectable = (r: ListingRow) => isAdmin || (r.canEdit && r.status === "draft");
  const pickable = rows.filter(selectable);
  const allOnPage = pickable.length > 0 && pickable.every((r) => selected.has(r.id));
  const chosen = rows.filter((r) => selected.has(r.id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const run = (action: string, ids = [...selected]) =>
    start(async () => {
      // Archiving live listings can be undone by publishing them again.
      const wasLive = action === "archive" ? rows.filter((r) => ids.includes(r.id) && r.status === "published").map((r) => r.id) : [];
      const res = await batchListings(action, ids);
      const live = wasLive.filter((id) => res.results?.some((r) => r.id === id && r.ok));
      toast(res.message, res.ok ? "ok" : "danger", live.length ? { label: "Undo", run: () => run("publish", live) } : undefined);
      setOutcome(res.ok ? null : res);
      if (res.ok) setSelected(new Set());
      else setSelected(new Set((res.results ?? []).filter((r) => !r.ok).map((r) => r.id)));
    });

  const actions = isAdmin ? ACTIONS.admin : ACTIONS.coordinator;
  const n = selected.size;
  const unverified = chosen.filter((r) => r.verification === "unverified" && r.status !== "published").length;
  const dialogs = {
    publish: {
      title: `Publish ${n} ${n === 1 ? "listing" : "listings"}?`,
      body: `Students can find ${n === 1 ? "it" : "them"} right away.${unverified ? ` ${unverified} of ${n} ${unverified === 1 ? "isn't" : "aren't"} verified yet; students see an Unverified warning on ${unverified === 1 ? "it" : "those"}.` : ""}`,
      action: "Publish",
    },
    unpublish: {
      title: `Unpublish ${n} ${n === 1 ? "listing" : "listings"}?`,
      body: "Published ones go back to draft, and students can't find or open them until they're published again.",
      action: "Unpublish",
    },
    delete: {
      title: `Delete ${n} ${n === 1 ? "listing" : "listings"}?`,
      body: "Students tracking them lose their checklists for these listings. Archive instead if you may need them again.",
      action: "Delete permanently",
    },
  } as const;
  const d = confirm ? dialogs[confirm] : null;

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
              <th scope="col" className="w-12 px-4 py-1">
                <CheckCell label="Select all listings on this page" checked={allOnPage} disabled={!pickable.length} onChange={() => setSelected(allOnPage ? new Set() : new Set(pickable.map((r) => r.id)))} />
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
                <td className="px-4 py-1">
                  <CheckCell label={`Select ${r.name}`} checked={selected.has(r.id)} disabled={!selectable(r)} onChange={() => toggle(r.id)} />
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
                <td className={`tnum px-4 py-3 whitespace-nowrap ${DUE[r.urgency] || "text-ink"}`}>{r.closes}</td>
                <td className="px-4 py-3">
                  <Trust r={r} />
                </td>
                <td className="px-4 py-3 text-ink-secondary">{r.coordinator}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {r.canEdit ? (
                    <Link href={`/staff/listings/${r.id}`} className="font-semibold">
                      Edit<span className="sr-only"> {r.name}</span>
                    </Link>
                  ) : (
                    <Link href={`/staff/listings/${r.id}`} className="text-ink-secondary">
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
            {pickable.length ? (
              <span className="pt-0.5 pl-3">
                <CheckCell label={`Select ${r.name}`} checked={selected.has(r.id)} disabled={!selectable(r)} onChange={() => toggle(r.id)} />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{r.name}</p>
              <p className="text-caption text-ink-secondary">{r.provider.name}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Pill tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Pill>
                <Trust r={r} compact />
              </div>
              <p className="mt-2 text-caption text-ink-secondary">
                <span className={DUE[r.urgency]}>Deadline {r.closes}</span> · {r.coordinator}
              </p>
            </div>
            <Link href={`/staff/listings/${r.id}`} className={`inline-flex min-h-11 items-center self-center px-1 text-sm font-semibold ${r.canEdit ? "" : "text-ink-secondary"}`}>
              {r.canEdit ? "Edit" : "View"}
              <span className="sr-only"> {r.name}</span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Batch bar: inline on desktop, sticky above the tab bar on phones */}
      {n > 0 ? (
        <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center gap-2 border-t border-hairline bg-surface px-4 py-3 shadow-overlay nav:bottom-0 sm:px-5" role="region" aria-label="Batch actions">
          <span className="mr-2 text-sm font-semibold text-ink">{n} selected</span>
          {actions.map(([a, label]) =>
            a === "publish" || a === "unpublish" || a === "delete" ? (
              <Button key={a} variant={a === "delete" ? "outline-danger" : a === "publish" ? "primary" : "outline"} size="sm" disabled={pending} onClick={() => setConfirm(a)}>
                {label}
              </Button>
            ) : (
              <Button key={a} variant={a === "submit" ? "primary" : "outline"} size="sm" disabled={pending} onClick={() => run(a)}>
                {label}
              </Button>
            ),
          )}
          <Button variant="text" size="sm" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        </div>
      ) : null}

      <Dialog open={!!d} onOpenChange={(o) => !o && setConfirm(null)} title={d?.title ?? ""} description={d?.body}>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
          <Button
            variant={confirm === "delete" ? "danger" : "primary"}
            loading={pending}
            onClick={() => {
              const action = confirm!;
              setConfirm(null);
              run(action);
            }}
          >
            {d?.action}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
