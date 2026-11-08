"use client";

import { createContext, useContext, useEffect, useState } from "react";

const Ctx = createContext<{ dirty: boolean; setDirty: (d: boolean) => void }>({ dirty: false, setDirty: () => {} });

/** Lets the status panel know the form below has unsaved edits (its actions act on the saved version). */
export function UnsavedProvider({ children }: { children: React.ReactNode }) {
  const [dirty, setDirty] = useState(false);
  return <Ctx.Provider value={{ dirty, setDirty }}>{children}</Ctx.Provider>;
}

export const useUnsaved = () => useContext(Ctx);

const LEAVE = "Leave without saving? Your changes to this listing will be lost.";

/**
 * While `dirty`: warn on tab close/reload, and ask before following any in-app link.
 * ponytail: the browser Back button inside the app isn't intercepted (App Router has no blocking API).
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
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
}
