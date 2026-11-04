"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { deleteMyAnswers } from "./actions";

/** "Delete my eligibility answers", behind a confirmation. Applications and alerts are kept. */
export function DeleteAnswers() {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="text" className="px-0 text-danger!" onClick={() => setOpen(true)}>
        Delete my eligibility answers
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Delete your eligibility answers?"
        description="Your course, grades, family and region answers are erased. Matches and “You qualify” labels disappear until you answer again. Your saved scholarships, checklists and alerts stay."
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep them
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteMyAnswers();
                toast(res.message, res.ok ? "ok" : "danger");
                if (res.ok) {
                  setOpen(false);
                  router.refresh();
                }
              })
            }
          >
            Delete answers
          </Button>
        </div>
      </Dialog>
    </>
  );
}
