"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { batchListings } from "@/lib/actions/staff";

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
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const run = (action: string) =>
    start(async () => {
      const res = await batchListings(action, [id]);
      const detail = res.results?.[0]?.error;
      toast(res.ok ? res.message : (detail ?? res.message), res.ok ? "ok" : "danger");
      if (res.ok && action === "delete") router.replace("/staff/listings");
      else router.refresh();
    });

  return (
    <div className="flex flex-wrap gap-2">
      {!isAdmin && status === "draft" ? <Button loading={pending} onClick={() => run("submit")}>Send for verification</Button> : null}
      {isAdmin ? (
        <>
          <Button variant={verified ? "outline" : "primary"} loading={pending} onClick={() => run("verify")}>
            {verified ? "Mark as checked today" : "Verify against the source"}
          </Button>
          {status !== "published" ? (
            <Button variant={verified ? "primary" : "outline"} disabled={pending} onClick={() => run("publish")}>
              Publish
            </Button>
          ) : (
            <Button variant="outline" disabled={pending} onClick={() => run("unpublish")}>
              Unpublish
            </Button>
          )}
          {status !== "archived" ? (
            <Button variant="outline" disabled={pending} onClick={() => run("archive")}>
              Archive
            </Button>
          ) : null}
          <Button variant="outline-danger" disabled={pending} onClick={() => setConfirm(true)}>
            Delete
          </Button>
          <Dialog open={confirm} onOpenChange={setConfirm} title="Delete this listing?" description="Students tracking it lose their checklist for it. Archive it instead if you may need it again.">
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
              <Button
                variant="danger"
                loading={pending}
                onClick={() => {
                  setConfirm(false);
                  run("delete");
                }}
              >
                Delete permanently
              </Button>
            </div>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}
