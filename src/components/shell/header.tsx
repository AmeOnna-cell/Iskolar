import Link from "next/link";
import { Icon, LogoMark } from "@/components/icons";
import { homeHref, primaryNav, type Viewer } from "@/lib/nav";
import { AccountMenu } from "./account-menu";
import { AlertsBell } from "./alerts-bell";
import { HeaderNav, SignedOutLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

type Props = { viewer: Viewer; userId?: string; unread?: number; signOut?: React.ReactNode };

/** Sticky 64px header (56px under 900px). Primary nav moves to the bottom tab bar on small screens. */
export function Header({ viewer, userId, unread = 0, signOut }: Props) {
  const isStudent = viewer?.role === "student";
  return (
    <>
      {viewer && !isStudent ? (
        <section aria-label="Scholarship office view" className="bg-band text-white">
          <div className="page-container flex h-10 items-center gap-2 text-caption">
            <Icon name="shield" size={16} />
            <span className="font-semibold">Scholarship office view</span>
            <span className="text-band-text-soft">· {viewer.role === "admin" ? "Admin" : "Coordinator"}</span>
          </div>
        </section>
      ) : null}
      <header className="sticky top-0 z-30 border-b border-hairline bg-surface">
        <div className="page-container flex h-14 items-center gap-6 nav:h-16">
          <Link
            href={homeHref(viewer)}
            aria-label="Iskolar home"
            className="flex min-h-11 items-center gap-2 text-title-sm font-bold tracking-tight text-ink no-underline"
          >
            <LogoMark size={30} />
            Iskolar
          </Link>
          <HeaderNav items={primaryNav(viewer)} />
          <div className="ml-auto flex items-center gap-1">
            {/* Signed-out phones: no room beside "Create account"; the system theme still applies. */}
            <span className={viewer ? "contents" : "contents max-sm:hidden"}>
              <ThemeToggle />
            </span>
            <Link
              href="/help"
              aria-label="Help"
              title="Help"
              className="grid size-11 place-items-center rounded-full text-ink-secondary hover:bg-surface-hover hover:text-ink"
            >
              <Icon name="help" size={20} />
            </Link>
            {isStudent && userId ? <AlertsBell userId={userId} initial={unread} /> : null}
            {viewer ? (
              <AccountMenu viewer={viewer} signOut={signOut} />
            ) : (
              <SignedOutLinks />
            )}
          </div>
        </div>
      </header>
    </>
  );
}
