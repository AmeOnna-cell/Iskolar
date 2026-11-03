"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { isActive, type NavItem } from "@/lib/nav";

/** Desktop header links (≥900px). The active link is Civic Blue with a 2px underline on the header rule. */
export function HeaderNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden h-full gap-1 nav:flex">
      {items
        .filter((i) => i.href !== "/help")
        .map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`-mb-px flex items-center border-b-2 px-3 text-sm no-underline transition-colors duration-150 ${
                active
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent font-medium text-ink-secondary hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}

/** Mobile bottom tab bar (<900px): five equal tabs, 24px icons over 12px labels, safe-area padding. */
export function TabBar({ items, unread = 0 }: { items: NavItem[]; unread?: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-30 grid border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] nav:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-tab no-underline ${
              active ? "font-semibold text-primary" : "font-medium text-ink-hint"
            }`}
          >
            <Icon name={item.icon} size={24} />
            <span>{item.short}</span>
            {item.href === "/dashboard" && unread > 0 ? <span className="sr-only">, {unread} unread alerts</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
