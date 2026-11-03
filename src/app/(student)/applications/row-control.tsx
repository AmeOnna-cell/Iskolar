"use client";

import { useTransition } from "react";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { removeApplication, setApplicationResult, setApplicationStage } from "@/lib/actions/student";

/** Stage select (Saved / Preparing / Submitted / Remove) or, once submitted, the result select. */
export function RowControl({
  applicationId,
  scholarshipId,
  name,
  stage,
  result,
}: {
  applicationId: string;
  scholarshipId: string;
  name: string;
  stage: "saved" | "preparing" | "submitted";
  result: "pending" | "approved" | "rejected";
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const res = await fn();
      toast(res.message, res.ok ? "ok" : "danger");
    });
  const cls = `${inputClass} border-hairline-strong text-sm`;

  if (stage === "submitted") {
    return (
      <label className="block">
        <span className="sr-only">Result for {name}</span>
        <select
          className={cls}
          disabled={pending}
          value={result}
          onChange={(e) => {
            const v = e.target.value;
            run(() => (v === "__back" ? setApplicationStage(scholarshipId, "preparing") : setApplicationResult(applicationId, v)));
          }}
        >
          <option value="pending">Waiting for results</option>
          <option value="approved">Approved</option>
          <option value="rejected">Not approved</option>
          <option value="__back">Move back to Preparing</option>
        </select>
      </label>
    );
  }
  return (
    <label className="block">
      <span className="sr-only">Status of {name}</span>
      <select
        className={cls}
        disabled={pending}
        value={stage}
        onChange={(e) => {
          const v = e.target.value;
          run(() => (v === "__remove" ? removeApplication(scholarshipId) : setApplicationStage(scholarshipId, v)));
        }}
      >
        <option value="saved">Saved</option>
        <option value="preparing">Preparing</option>
        <option value="submitted">Submitted</option>
        <option value="__remove">Remove</option>
      </select>
    </label>
  );
}
