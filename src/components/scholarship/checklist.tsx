"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { toggleDocument } from "@/lib/actions/student";
import { Meter } from "./bits";

type Doc = { id: string; name: string; where_to_get: string };

/** Document checklist with "where to get it". Ticking the first document starts preparing. */
export function DocumentChecklist({
  scholarshipId,
  slug,
  docs,
  checked,
  canTrack,
  tracked,
}: {
  scholarshipId: string;
  slug: string;
  docs: Doc[];
  checked: string[];
  canTrack: boolean;
  tracked: boolean;
}) {
  const toast = useToast();
  const [, start] = useTransition();
  const [ready, setReady] = useOptimistic(checked, (state: string[], change: { id: string; on: boolean }) =>
    change.on ? [...new Set([...state, change.id])] : state.filter((x) => x !== change.id),
  );
  const done = ready.filter((id) => docs.some((d) => d.id === id)).length;

  const onToggle = (doc: Doc, on: boolean) =>
    start(async () => {
      setReady({ id: doc.id, on });
      const res = await toggleDocument(scholarshipId, doc.id, on);
      if (!res.ok) toast(res.message, "danger");
      else if (res.added) toast(res.message);
      else if (on && done + 1 === docs.length) toast("All documents ready. You can submit now.");
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-sm text-ink-secondary">
        <div className="max-w-[220px] flex-1">
          <Meter value={done} max={docs.length} label="Documents ready" />
        </div>
        <span aria-live="polite">
          {done} of {docs.length} ready
        </span>
      </div>
      <ul className="overflow-hidden rounded-md border border-hairline">
        {docs.map((doc) => {
          const on = ready.includes(doc.id);
          const id = `doc-${doc.id}`;
          return (
            <li key={doc.id} className="border-t border-hairline first:border-t-0">
              <label
                htmlFor={id}
                className={`grid grid-cols-[20px_minmax(0,1fr)] gap-3 px-4 py-3 ${canTrack ? "cursor-pointer hover:bg-surface-hover" : ""}`}
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={on}
                  disabled={!canTrack}
                  onChange={(e) => onToggle(doc, e.target.checked)}
                  className="mt-1 size-[18px] accent-[var(--ok)]"
                />
                <span className="min-w-0">
                  <span className={`block text-base font-semibold ${on ? "text-ink-hint line-through" : "text-ink"}`}>{doc.name}</span>
                  {doc.where_to_get ? <span className="block text-sm text-ink-secondary">Where to get it: {doc.where_to_get}</span> : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {!canTrack ? (
        <p className="text-caption text-ink-hint">
          <Link href={`/login?next=/s/${slug}`}>Sign in</Link> to tick off documents and get reminders.
        </p>
      ) : !tracked ? (
        <p className="text-caption text-ink-hint">Ticking a document adds this scholarship to My applications.</p>
      ) : null}
    </div>
  );
}
