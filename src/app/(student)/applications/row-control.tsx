"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { removeApplication, setApplicationResult, setApplicationStage } from "@/lib/actions/student";

/**
 * The row's one next move (Start preparing → Mark as submitted → record the result), a small way
 * back, and Remove behind a confirmation (removing also clears the ticked documents).
 */
export function RowControl({
  applicationId,
  scholarshipId,
  name,
  stage,
  result,
  docsDone,
}: {
  applicationId: string;
  scholarshipId: string;
  name: string;
  stage: "saved" | "preparing" | "submitted";
  result: "pending" | "approved" | "rejected";
  docsDone: number;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const res = await fn();
      toast(res.message, res.ok ? "ok" : "danger");
    });
  const sr = <span className="sr-only"> for {name}</span>;

  let next: React.ReactNode = null;
  let back: React.ReactNode = null;
  if (stage === "saved") {
    next = (
      <Button variant="outline" size="sm" loading={pending} onClick={() => run(() => setApplicationStage(scholarshipId, "preparing"))}>
        Start preparing{sr}
      </Button>
    );
  } else if (stage === "preparing") {
    next = (
      <Button variant="outline" size="sm" loading={pending} onClick={() => run(() => setApplicationStage(scholarshipId, "submitted"))}>
        Mark as submitted{sr}
      </Button>
    );
  } else if (result === "pending") {
    next = (
      <>
        <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => setApplicationResult(applicationId, "approved"))}>
          Approved{sr}
        </Button>
        <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => setApplicationResult(applicationId, "rejected"))}>
          Not approved{sr}
        </Button>
      </>
    );
    back = (
      <Button variant="text" size="sm" disabled={pending} onClick={() => run(() => setApplicationStage(scholarshipId, "preparing"))}>
        Not sent yet{sr}
      </Button>
    );
  } else {
    back = (
      <Button variant="text" size="sm" disabled={pending} onClick={() => run(() => setApplicationResult(applicationId, "pending"))}>
        Change result{sr}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
      {next}
      {back}
      {stage !== "submitted" ? (
        <Button variant="text" size="sm" className="text-ink-secondary!" disabled={pending} onClick={() => setConfirming(true)}>
          Remove{sr}
        </Button>
      ) : null}
      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Remove ${name}?`}
        description={
          docsDone > 0
            ? `It leaves My applications and its reminders stop. The ${docsDone === 1 ? "document" : `${docsDone} documents`} you ticked will be cleared.`
            : "It leaves My applications and its reminders stop."
        }
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirming(false)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await removeApplication(scholarshipId);
                toast(res.message, res.ok ? "ok" : "danger");
                if (res.ok) setConfirming(false);
              })
            }
          >
            Remove
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
