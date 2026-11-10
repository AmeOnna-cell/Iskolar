import type { IconName } from "@/components/icons";

export type Role = "student" | "coordinator" | "admin";

/** What the shell needs to know about the signed-in person. Null when signed out. */
export type Viewer = {
  name: string | null;
  email: string;
  role: Role;
  subtitle?: string | null;
} | null;

/** `only` limits an item to the header ("wide", ≥900px) or the phone tab bar ("phone"). */
export type NavItem = { href: string; label: string; short: string; icon: IconName; only?: "wide" | "phone" };

export function homeHref(viewer: Viewer): string {
  if (!viewer) return "/";
  return viewer.role === "student" ? "/dashboard" : "/staff";
}

/** Primary navigation, shared by the desktop header and the mobile tab bar (prototype order). */
export function primaryNav(viewer: Viewer): NavItem[] {
  if (viewer && viewer.role !== "student") {
    const staff: NavItem[] = [
      { href: "/staff", label: "Overview", short: "Overview", icon: "grid" },
      { href: "/staff/listings", label: "Listings", short: "Listings", icon: "list" },
      { href: "/staff/inquiries", label: "Questions", short: "Questions", icon: "help" },
      // On phones FAQs is reached from the Questions page, so the tab bar stays at five (DESIGN.md).
      { href: "/staff/faqs", label: "FAQs", short: "FAQs", icon: "q", only: "wide" },
      { href: "/staff/announcements", label: "Announcements", short: "News", icon: "mega" },
    ];
    if (viewer.role === "admin") {
      staff.push({ href: "/admin/users", label: "Users", short: "Users", icon: "users" });
    }
    return staff;
  }
  // Visitors: only the public pages. Eligibility check, My applications and Announcements need an
  // account; phones get a "Sign in" tab (the header shows only "Create account" there).
  if (!viewer) {
    return [
      { href: "/", label: "Home", short: "Home", icon: "home" },
      { href: "/explore", label: "Find scholarships", short: "Search", icon: "search" },
      { href: "/help", label: "Help", short: "Help", icon: "help" },
      { href: "/login", label: "Sign in", short: "Sign in", icon: "user", only: "phone" },
    ];
  }
  return [
    { href: "/dashboard", label: "Dashboard", short: "Dashboard", icon: "grid" },
    { href: "/explore", label: "Find scholarships", short: "Search", icon: "search" },
    { href: "/check", label: "Eligibility check", short: "Eligibility", icon: "check" },
    { href: "/applications", label: "My applications", short: "Applications", icon: "brief" },
    { href: "/announcements", label: "Announcements", short: "News", icon: "mega" },
    { href: "/help", label: "Help", short: "Help", icon: "help" },
  ];
}

/** True when `href` is the current section. Scholarship detail pages belong to Find scholarships. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/explore" && pathname.startsWith("/s/")) return true;
  if (href === "/staff") return pathname === "/staff";
  return pathname === href || pathname.startsWith(href + "/");
}
