"use client";

import { useEffect, useRef } from "react";

export function ExploreDetailPanel({ children }: { children: React.ReactNode }) {
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = panel.current;
    const results = element?.previousElementSibling;
    if (!element || !results) return;

    const fit = () => {
      const top = parseFloat(getComputedStyle(element).top);
      const available = window.innerHeight - top - 16;
      const bounds = results.getBoundingClientRect();
      // Only constrain the sticky panel at the end of a list taller than the panel.
      const height = bounds.height > available ? Math.min(available, bounds.bottom - top) : available;
      element.style.setProperty("--detail-height", `${Math.max(224, height)}px`);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(results);
    window.addEventListener("resize", fit);
    window.addEventListener("scroll", fit, { passive: true });
    fit();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
      window.removeEventListener("scroll", fit);
    };
  }, []);

  return (
    <aside
      ref={panel}
      aria-label="Selected scholarship"
      className="sticky top-20 hidden max-h-[var(--detail-height,calc(100dvh-6rem))] overflow-auto rounded-md border border-hairline bg-surface shadow-rest lg:block"
    >
      {children}
    </aside>
  );
}
