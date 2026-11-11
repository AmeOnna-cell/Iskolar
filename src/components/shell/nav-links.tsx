"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { isActive, type NavItem } from "@/lib/nav";

/** Desktop header links (≥900px). The active link is Civic Blue with a 2px underline on the header rule. */
export function HeaderNav({ items, tracked = 0 }: { items: NavItem[]; tracked?: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden h-full gap-1 nav:flex">
      {items
        .filter((i) => i.href !== "/help" && i.only !== "phone")
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
              {item.href === "/applications" && tracked > 0 ? (
                <span aria-hidden="true" className="tnum ml-1.5 rounded-full bg-primary-wash px-1.5 text-caption font-semibold text-primary">{tracked}</span>
              ) : null}
            </Link>
          );
        })}
    </nav>
  );
}

/** Mobile bottom tab bar (<900px): five equal tabs, 24px icons over 12px labels, safe-area padding. */
export function TabBar({ items: all, unread = 0 }: { items: NavItem[]; unread?: number }) {
  // Five equal tabs (DESIGN.md): Help lives in the header's "?" button at every width.
  const items = all.filter((i) => i.href !== "/help" && i.only !== "wide");
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

const quiet = "h-11 items-center rounded-sm px-3 text-sm font-semibold text-ink no-underline hover:bg-surface-hover nav:h-9";

const AUTH_PAGES = ["/login", "/signup", "/check-email", "/forgot-password"];

/** Signed-out header links. On the sign-in pages only the counterpart shows, as a quiet link, so it
 * doesn't compete with the page's own button. */
export function SignedOutLinks() {
  const pathname = usePathname();
  if (AUTH_PAGES.includes(pathname)) {
    const [href, label] = pathname === "/login" ? ["/signup", "Create account"] : ["/login", "Sign in"];
    // Below 900px the tab bar has its own "Sign in" tab.
    return (
      <Link href={href} className={`ml-2 ${href === "/login" ? "hidden nav:inline-flex" : "inline-flex"} ${quiet}`}>
        {label}
      </Link>
    );
  }
  return (
    <div className="ml-1 flex items-center gap-2 sm:ml-2">
      {/* Below 900px the tab bar has its own "Sign in" tab. */}
      <Link href="/login" className={`hidden nav:inline-flex ${quiet}`}>
        Sign in
      </Link>
      <Link
        href="/signup"
        className="inline-flex h-11 items-center rounded-sm bg-primary px-3 text-sm font-semibold whitespace-nowrap text-on-primary no-underline transition-colors duration-150 hover:bg-primary-hover nav:h-9"
      >
        {/* Eligibility check isn't in a visitor's nav, so the wide-screen button says what an account unlocks. */}
        <span className="nav:hidden">Create account</span>
        <span className="hidden nav:inline">Create an account to check eligibility</span>
      </Link>
    </div>
  );
}
