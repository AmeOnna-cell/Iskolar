"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { removeApplication, setApplicationStage } from "@/lib/actions/student";

/**
 * Bookmark on a card. Saving adds the scholarship to My applications; unsaving removes it only
 * while it's still just "saved" (preparing/submitted can't be lost by a stray tap).
 */
export function SaveButton({
  scholarshipId,
  slug,
  name,
  stage,
  signedIn,
}: {
  scholarshipId: string;
  slug: string;
  name: string;
  stage: "saved" | "preparing" | "submitted" | null;
  signedIn: boolean;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(stage);
  const cls =
    "absolute top-2.5 right-2.5 z-10 grid size-11 place-items-center rounded-full text-ink-hint transition-colors duration-150 hover:bg-surface-hover hover:text-ink";

  if (!signedIn) {
    return (
      <Link href={`/login?next=/s/${slug}`} aria-label={`Sign in to save ${name}`} title="Sign in to save" className={cls}>
        <Icon name="bookmark" size={20} />
      </Link>
    );
  }

  const saved = optimistic !== null;
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Saved: ${name}` : `Save ${name}`}
      title={saved ? "In My applications" : "Save"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (optimistic && optimistic !== "saved") {
            toast("Already in My applications");
            return;
          }
          setOptimistic(saved ? null : "saved");
          const res = saved ? await removeApplication(scholarshipId) : await setApplicationStage(scholarshipId, "saved");
          toast(res.message, res.ok ? "ok" : "danger");
        })
      }
      className={`${cls} ${saved ? "text-primary" : ""}`}
    >
      <Icon name="bookmark" size={20} className={saved ? "fill-current" : ""} />
    </button>
  );
}
