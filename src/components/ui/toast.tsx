"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

type Action = { label: string; run: () => void };
type Toast = { id: number; message: string; tone: "ok" | "danger"; action?: Action };
type Show = (message: string, tone?: Toast["tone"], action?: Action) => void;
const ToastContext = createContext<Show>(() => {});

/** Confirmation toasts: bottom-centre (above the tab bar on phones), role="status". 3 s, or 6 s with an action (Undo). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback<Show>((message, tone = "ok", action) => {
    setToast({ id: Date.now(), message, tone, action });
  }, []);
  useEffect(() => {
    if (!toast) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), toast.action ? 6000 : 3000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast]);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 nav:bottom-6"
      >
        {toast ? (
          <div
            key={toast.id}
            className="pointer-events-auto flex max-w-[calc(100vw-32px)] items-center gap-3 rounded-md bg-toast px-4 py-3 text-sm font-medium text-white shadow-overlay motion-safe:animate-[toast-in_150ms_cubic-bezier(0.2,0,0,1)]"
          >
            <Icon name={toast.tone === "ok" ? "yes" : "warn"} size={18} className={toast.tone === "ok" ? "text-[#7ee2a8]" : "text-[#ffb4ab]"} />
            <span>{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.run();
                  setToast(null);
                }}
                className="-my-2 -mr-2 min-h-11 rounded-sm px-3 font-semibold text-[#a9c4ff] underline-offset-2 hover:underline"
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
