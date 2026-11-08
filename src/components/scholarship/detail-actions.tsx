"use client";

import { useOptimistic, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { removeApplication, setApplicationStage } from "@/lib/actions/student";
import { Pill } from "./bits";
import { ShareButton } from "./share-button";

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
  docsTotal,
  docsDone,
  dueText,
  name,
  sample,
  documentsId,
  className = "mt-6",
}: {
  scholarshipId: string;
  slug: string;
  stage: Stage;
  status: string;
  sourceUrl: string | null;
  signedIn: boolean;
  isStudent: boolean;
  docsTotal: number;
  docsDone: number;
  /** "closes in 4 days" / "closes today" while open, otherwise null. */
  dueText: string | null;
  name: string;
  sample: boolean;
  /** Id of the "Documents to prepare" heading (prefixed in the side panel). */
  documentsId: string;
  className?: string;
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
    <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 px-1 text-sm font-semibold">
      Official page <Icon name="ext" size={16} />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  ) : null;

  let main: React.ReactNode;
  if (!signedIn) {
    main = (
      <>
        <ButtonLink href="/signup">Create an account to save</ButtonLink>
        <a href={`/login?next=/s/${slug}`} className="inline-flex min-h-11 items-center px-1 text-sm font-semibold">
          Sign in
        </a>
      </>
    );
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
    const left = docsTotal - docsDone;
    // Until every document is ticked, the next step is the checklist, not "submitted".
    main =
      left > 0 ? (
        <>
          <p className="w-full text-sm font-semibold text-ink" data-testid="prep-status">
            {left === 1 ? "1 document left" : `${left} documents left`}
            {dueText ? ` · ${dueText}` : ""}
          </p>
          <ButtonLink href={`#${documentsId}`}>See what&apos;s missing</ButtonLink>
          <Button variant="outline" loading={pending} onClick={() => go("submitted")}>Mark as submitted</Button>
        </>
      ) : (
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
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {main}
      <ShareButton slug={slug} name={name} sample={sample} />
      {official}
    </div>
  );
}
