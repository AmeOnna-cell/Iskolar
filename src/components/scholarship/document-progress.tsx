"use client";

import { createContext, useContext, useOptimistic } from "react";

type Change = { slug: string; documentId: string; checked: boolean };
type Updates = Record<string, Record<string, boolean>>;

const ProgressContext = createContext<{ updates: Updates; update: (change: Change) => void } | null>(null);

export function DocumentProgressProvider({ children }: { children: React.ReactNode }) {
  const [updates, update] = useOptimistic<Updates, Change>({}, (state, change) => ({
    ...state,
    [change.slug]: { ...state[change.slug], [change.documentId]: change.checked },
  }));
  return <ProgressContext.Provider value={{ updates, update }}>{children}</ProgressContext.Provider>;
}

export function useDocumentProgress() {
  return useContext(ProgressContext);
}
