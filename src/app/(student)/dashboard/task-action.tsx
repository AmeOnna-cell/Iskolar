"use client";

import { useTransition } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { setApplicationStage } from "@/lib/actions/student";
import type { Task } from "@/lib/dashboard";

/** A next-step's action: a link, or a one-tap stage change (start preparing / mark submitted). */
export function TaskAction({ action }: { action: Task["action"] }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  if (action.href) {
    return (
      <ButtonLink href={action.href} variant="outline" size="sm">
        {action.label}
      </ButtonLink>
    );
  }
  return (
    <Button
      variant="outline"
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await setApplicationStage(action.scholarshipId!, action.stage!);
          toast(res.message, res.ok ? "ok" : "danger");
        })
      }
    >
      {action.label}
    </Button>
  );
}
