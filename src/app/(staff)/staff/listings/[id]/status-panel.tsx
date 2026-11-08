"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { batchListings } from "@/lib/actions/staff";
import { useUnsaved } from "../unsaved";

type Confirm = null | "publish" | "unpublish" | "delete";

/** Workflow buttons for one listing; only the actions this role may take are shown. */
export function StatusPanel({
  id,
  status,
  verified,
  isAdmin,
}: {
  id: string;
  status: "draft" | "in_review" | "published" | "archived";
  verified: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { dirty } = useUnsaved();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const run = (action: string) =>
    start(async () => {
      const res = await batchListings(action, [id]);
      const detail = res.results?.[0]?.error;
      // Archiving a live listing can be undone by publishing it again; other states can't be restored exactly.
      const undo = res.ok && action === "archive" && status === "published" ? { label: "Undo", run: () => run("publish") } : undefined;
      toast(res.ok ? res.message : (detail ?? res.message), res.ok ? "ok" : "danger", undo);
      if (res.ok && action === "delete") router.replace("/staff/listings");
      else router.refresh();
    });
  const off = pending || dirty;

  const dialogs = {
    publish: {
      title: "Publish this listing?",
      body: verified
        ? "Students can find it, check their eligibility and track it right away."
        : "Students can find it right away, with an Unverified warning until it's checked against the source.",
      action: "Publish",
    },
    unpublish: {
      title: "Unpublish this listing?",
      body: "It goes back to draft and students can't find or open it until it's published again.",
      action: "Unpublish",
    },
    delete: {
      title: "Delete this listing?",
      body: "Students tracking it lose their checklist for it. Archive it instead if you may need it again.",
      action: "Delete permanently",
    },
  } as const;
  const d = confirm ? dialogs[confirm] : null;

  return (
    <div className="flex flex-col gap-3">
      {dirty ? <p className="text-sm font-semibold text-ink">Save your changes first. These buttons act on the saved version.</p> : null}
      <div className="flex flex-wrap gap-2">
        {!isAdmin && status === "draft" ? <Button loading={pending} disabled={dirty} onClick={() => run("submit")}>Send for verification</Button> : null}
        {isAdmin ? (
          <>
            <Button variant={verified ? "outline" : "primary"} loading={pending} disabled={dirty} onClick={() => run("verify")}>
              {verified ? "Mark as checked today" : "Verify against the source"}
            </Button>
            {status !== "published" ? (
              <Button variant={verified ? "primary" : "outline"} disabled={off} onClick={() => setConfirm("publish")}>
                Publish
              </Button>
            ) : (
              <Button variant="outline" disabled={off} onClick={() => setConfirm("unpublish")}>
                Unpublish
              </Button>
            )}
            {status !== "archived" ? (
              <Button variant="outline" disabled={off} onClick={() => run("archive")}>
                Archive
              </Button>
            ) : null}
            <Button variant="outline-danger" disabled={off} onClick={() => setConfirm("delete")}>
              Delete
            </Button>
          </>
        ) : null}
      </div>
      <Dialog open={!!d} onOpenChange={(o) => !o && setConfirm(null)} title={d?.title ?? ""} description={d?.body}>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
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
    </div>
  );
}
