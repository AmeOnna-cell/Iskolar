"use client";

import * as D from "@radix-ui/react-dialog";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons";

// URLs this tab pushed to open a panel. Closing one of those goes Back (so the history entry is
// consumed); a panel opened from a shared link closes by dropping its parameter instead.
const pushed = new Set<string>();
// What had focus when a panel was opened; it gets focus back on close (Radix only knows its own triggers).
let opener: HTMLElement | null = null;
const here = () => window.location.pathname + window.location.search;

/**
 * Open state for a drawer kept in the URL (`?param=value`), so Back closes it instead of leaving
 * the page and a shared link reopens it.
 */
export function useUrlPanel(param: string) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const value = sp.get(param);
  const hrefWith = (patch: Record<string, string | null>) => {
    const u = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) u.delete(k);
      else u.set(k, v);
    }
    const q = u.toString();
    return q ? `${pathname}?${q}` : pathname;
  };
  const open = (v = "1", extra: Record<string, string | null> = {}, from?: HTMLElement) => {
    opener = from ?? (document.activeElement as HTMLElement | null);
    const href = hrefWith({ ...extra, [param]: v });
    pushed.add(href);
    router.push(href, { scroll: false });
  };
  const close = () => {
    if (pushed.delete(here())) router.back();
    else router.replace(hrefWith({ [param]: null }), { scroll: false });
  };
  /** Leave the drawer by replacing its history entry with `href` (e.g. "Done" applying filters). */
  const closeTo = (href: string) => {
    pushed.delete(here());
    router.replace(href, { scroll: false });
  };
  return { value, isOpen: value !== null, open, close, closeTo, hrefWith };
}

/**
 * Bottom sheet on phones (below 640px), side drawer from the right on wider screens. Radix gives the
 * focus trap, Esc to close and focus back to the trigger. Esc inside an open combobox list only
 * closes that list.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  footer,
  width = "narrow",
  titleHidden = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  width?: "narrow" | "wide";
  /** The content brings its own visible heading (the scholarship details): keep the title for screen readers only. */
  titleHidden?: boolean;
  children: React.ReactNode;
}) {
  return (
    <D.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[var(--scrim)] motion-safe:animate-[fade-in_200ms_ease-out]" />
        <D.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).focus();
          }}
          tabIndex={-1}
          onCloseAutoFocus={(e) => {
            if (opener?.isConnected) {
              e.preventDefault();
              opener.focus({ preventScroll: true });
            }
          }}
          onEscapeKeyDown={(e) => {
            if ((e.target as HTMLElement | null)?.getAttribute?.("aria-expanded") === "true") e.preventDefault();
          }}
          className={`fixed z-50 flex flex-col bg-surface text-ink shadow-overlay outline-none max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[92dvh] max-sm:rounded-t-lg max-sm:pb-[env(safe-area-inset-bottom)] max-sm:motion-safe:animate-[sheet-up_260ms_cubic-bezier(0.2,0.8,0.2,1)] sm:inset-y-0 sm:right-0 sm:motion-safe:animate-[drawer-in_260ms_cubic-bezier(0.2,0.8,0.2,1)] ${
            width === "wide" ? "sm:w-[min(640px,100vw)]" : "sm:w-[min(420px,100vw)]"
          }`}
        >
          {titleHidden ? (
            <>
              {/* Names the dialog without adding a second heading next to the content's own. */}
              <D.Title asChild>
                <span className="sr-only">{title}</span>
              </D.Title>
              <D.Close aria-label="Close" className="absolute top-2 right-2 z-20 grid size-11 place-items-center rounded-full bg-surface text-ink-hint shadow-rest hover:bg-surface-hover hover:text-ink">
                <Icon name="no" size={18} />
              </D.Close>
            </>
          ) : (
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-hairline px-4 py-3 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <D.Title className="text-title-sm font-[650] text-ink">{title}</D.Title>
                {description ? <D.Description className="mt-0.5 text-sm text-ink-secondary">{description}</D.Description> : null}
              </div>
              <D.Close aria-label="Close" className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-ink-hint hover:bg-surface-hover hover:text-ink">
                <Icon name="no" size={18} />
              </D.Close>
            </div>
          )}
          {/* With a hidden title, the content's own header makes room for the floating close button. */}
          <div className={`min-h-0 flex-1 overflow-auto overscroll-contain ${titleHidden ? "[&_[data-testid=panel-header]]:pr-14" : ""}`}>{children}</div>
          {footer ? <div className="flex shrink-0 items-center justify-between gap-3 border-t border-hairline px-4 py-3 sm:px-6">{footer}</div> : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
