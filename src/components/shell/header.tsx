import Link from "next/link";
import { Icon, LogoMark } from "@/components/icons";
import { homeHref, primaryNav, type Viewer } from "@/lib/nav";
import { AccountMenu } from "./account-menu";
import { HeaderNav } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

type Props = { viewer: Viewer; unread?: number; signOut?: React.ReactNode };

/** Sticky 64px header (56px under 900px). Primary nav moves to the bottom tab bar on small screens. */
export function Header({ viewer, unread = 0, signOut }: Props) {
  const isStudent = viewer?.role === "student";
  return (
    <>
      {viewer && !isStudent ? (
        <div className="bg-band text-white">
          <div className="page-container flex h-10 items-center gap-2 text-caption">
            <Icon name="shield" size={16} />
            <span className="font-semibold">Scholarship office view</span>
            <span className="text-band-text-soft">· {viewer.role === "admin" ? "Admin" : "Coordinator"}</span>
          </div>
        </div>
      ) : null}
      <header className="sticky top-0 z-30 border-b border-hairline bg-surface">
        <div className="page-container flex h-14 items-center gap-6 nav:h-16">
          <Link
            href={homeHref(viewer)}
            aria-label="Iskolar home"
            className="flex items-center gap-2 text-title-sm font-bold tracking-tight text-ink no-underline"
          >
            <LogoMark size={30} />
            Iskolar
          </Link>
          <HeaderNav items={primaryNav(viewer)} />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/help"
              aria-label="Help"
              title="Help"
              className="hidden size-11 place-items-center rounded-full text-ink-secondary hover:bg-surface-hover hover:text-ink nav:grid"
            >
              <Icon name="help" size={20} />
            </Link>
            {isStudent ? (
              <Link
                href="/alerts"
                aria-label={unread ? `Alerts, ${unread} unread` : "Alerts"}
                title="Alerts"
                className="relative grid size-11 place-items-center rounded-full text-ink-secondary hover:bg-surface-hover hover:text-ink"
              >
                <Icon name="bell" size={20} />
                {unread > 0 ? (
                  <span
                    data-testid="unread-badge"
                    className="tnum absolute top-1 right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-surface bg-danger px-1 text-tab leading-none font-bold text-white"
                  >
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </Link>
            ) : null}
            {viewer ? (
              <AccountMenu viewer={viewer} signOut={signOut} />
            ) : (
              <div className="ml-2 flex items-center gap-2">
                <Link
                  href="/login"
                  className="hidden h-9 items-center rounded-sm px-3 text-sm font-semibold text-ink no-underline hover:bg-surface-hover sm:inline-flex"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-9 items-center rounded-sm bg-primary px-3 text-sm font-semibold text-on-primary no-underline transition-colors duration-150 hover:bg-primary-hover"
                >
                  Create account
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
