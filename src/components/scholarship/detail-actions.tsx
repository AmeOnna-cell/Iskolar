"use client";

import { useOptimistic, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { removeApplication, setApplicationStage } from "@/lib/actions/student";
import { Pill } from "./bits";

type Stage = "saved" | "preparing" | "submitted" | null;

/** The detail page's one primary action follows the tracker stage (prototype detailBody actions). */
export function DetailActions({
  scholarshipId,
  slug,
  stage,
  status,
  sourceUrl,
  signedIn,
  isStudent,
}: {
  scholarshipId: string;
  slug: string;
  stage: Stage;
  status: string;
  sourceUrl: string | null;
  signedIn: boolean;
  isStudent: boolean;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [current, setCurrent] = useOptimistic(stage);

  const go = (next: Exclude<Stage, null> | "remove") =>
    start(async () => {
      setCurrent(next === "remove" ? null : next);
      const res = next === "remove" ? await removeApplication(scholarshipId) : await setApplicationStage(scholarshipId, next);
      toast(res.message, res.ok ? "ok" : "danger");
    });

  const official = sourceUrl ? (
    <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-semibold">
      Official page <Icon name="ext" size={16} />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  ) : null;

  let main: React.ReactNode;
  if (!signedIn) {
    main = <ButtonLink href={`/login?next=/s/${slug}`}>Sign in to save and track</ButtonLink>;
  } else if (!isStudent) {
    main = null;
  } else if (current === null) {
    main =
      status === "closed" ? (
        <Button variant="outline" loading={pending} onClick={() => go("saved")}>
          <Icon name="bookmark" size={18} /> Save for next cycle
        </Button>
      ) : (
        <>
          <Button loading={pending} onClick={() => go("preparing")}>Start preparing</Button>
          <Button variant="outline" disabled={pending} onClick={() => go("saved")}>
            <Icon name="bookmark" size={18} /> Save
          </Button>
        </>
      );
  } else if (current === "saved") {
    main = (
      <>
        <Button loading={pending} onClick={() => go("preparing")}>Start preparing</Button>
        <Button variant="outline" aria-pressed="true" disabled={pending} onClick={() => go("remove")} className="border-primary bg-primary-wash text-primary">
          <Icon name="bookmark" size={18} className="fill-current" /> Saved
        </Button>
      </>
    );
  } else if (current === "preparing") {
    main = (
      <>
        <Button loading={pending} onClick={() => go("submitted")}>Mark as submitted</Button>
        <ButtonLink href="/applications?tab=preparing" variant="outline">View in my applications</ButtonLink>
      </>
    );
  } else {
    main = (
      <>
        <Pill tone="ok" icon="yes">Submitted</Pill>
        <ButtonLink href="/applications?tab=submitted" variant="text">Update result</ButtonLink>
      </>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      {main}
      {official}
    </div>
  );
}
