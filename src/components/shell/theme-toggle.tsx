"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { THEME_KEY } from "@/lib/head-scripts";

type Theme = "light" | "dark";

function effectiveTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "dark" || set === "light") return set;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(effectiveTheme());
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setTheme(effectiveTheme());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = theme ? `Switch to ${next} mode` : "Switch color theme";

  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {
          /* private mode: the choice lasts for this page only */
        }
        setTheme(next);
      }}
      aria-label={label}
      title={label}
      className="grid size-11 place-items-center rounded-full text-ink-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-ink"
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={20} />
    </button>
  );
}
