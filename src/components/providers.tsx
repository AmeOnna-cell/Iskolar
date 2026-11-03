"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ToastProvider } from "@/components/ui/toast";

let browserQueryClient: QueryClient | null = null;

/** The one client-side cache for per-user data. Cleared on sign-out (see SignOutItem). */
export function getQueryClient() {
  if (typeof window === "undefined") {
    return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });
  }
  browserQueryClient ??= new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });
  return browserQueryClient;
}

/**
 * If the browser restores a page from the back/forward cache (event.persisted), reload it so the
 * server decides again: after sign-out that means the login page, never the private page.
 */
function BfcacheGuard() {
  useEffect(() => {
    // Lets tests (and anything else) know the page is interactive.
    document.documentElement.dataset.hydrated = "true";
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(getQueryClient);
  return (
    <QueryClientProvider client={client}>
      <BfcacheGuard />
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
