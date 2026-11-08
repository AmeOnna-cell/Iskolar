"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { LEAVE_GUARD } from "@/lib/head-scripts";

const Ctx = createContext<{ dirty: boolean; setDirty: (d: boolean) => void }>({ dirty: false, setDirty: () => {} });

/** Lets the status panel know the form below has unsaved edits (its actions act on the saved version). */
export function UnsavedProvider({ children }: { children: React.ReactNode }) {
  const [dirty, setDirty] = useState(false);
  return <Ctx.Provider value={{ dirty, setDirty }}>{children}</Ctx.Provider>;
}

export const useUnsaved = () => useContext(Ctx);

const LEAVE = "Leave without saving? Your changes to this listing will be lost.";

/**
 * While `dirty`: warn on tab close/reload, and ask before following any in-app link or going Back/Forward.
 *
 * Back/Forward: the App Router has no blocking API, so the root layout's early popstate hook
 * (lib/head-scripts.ts) asks us first. On "stay" Next never sees the event, and we step history back to
 * the editor's entry, swallowing that popstate too, so the page and the form never change.
 */
export function useLeaveGuard(dirty: boolean) {
  const { setDirty } = useUnsaved();
  useEffect(() => setDirty(dirty), [dirty, setDirty]);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    const click = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement) || a.target === "_blank" || e.defaultPrevented) return;
      if (a.origin !== location.origin || (a.hash && a.pathname === location.pathname)) return;
      if (!window.confirm(LEAVE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const editorUrl = location.href;
    let undoing = false;
    // Runs before Next's popstate listener (see lib/head-scripts.ts); false = Next never sees the event.
    window[LEAVE_GUARD] = () => {
      if (undoing) {
        undoing = false;
        return false;
      }
      if (location.href === editorUrl || window.confirm(LEAVE)) return true;
      undoing = true;
      // ponytail: assumes Back (the editor is normally the newest entry); a cancelled Forward would step
      // forward again instead. Track entry indexes in history.state if that ever matters.
      history.go(1);
      return false;
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      delete window[LEAVE_GUARD];
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
}
