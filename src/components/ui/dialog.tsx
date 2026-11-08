"use client";

import * as D from "@radix-ui/react-dialog";
import { useRef } from "react";
import { Icon } from "@/components/icons";

/** Modal dialog; a full-height bottom sheet below 640px (DESIGN.md). Focus is trapped and restored. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  // The element focused when the dialog opened; Radix only restores focus to its own D.Trigger.
  const opener = useRef<HTMLElement | null>(null);
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[var(--scrim)]" />
        <D.Content
          onOpenAutoFocus={() => {
            // Runs before focus moves into the dialog, so this is still the button that opened it.
            opener.current = document.activeElement as HTMLElement | null;
          }}
          onCloseAutoFocus={(e) => {
            if (opener.current?.isConnected) {
              e.preventDefault();
              opener.current.focus({ preventScroll: true });
            }
          }}
          // Esc inside an open combobox list closes only the list.
          onEscapeKeyDown={(e) => {
            if ((e.target as HTMLElement | null)?.getAttribute?.("aria-expanded") === "true") e.preventDefault();
          }}
          className="fixed z-50 flex flex-col overflow-auto bg-surface text-ink shadow-overlay outline-none max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[100dvh] max-sm:min-h-[60dvh] max-sm:rounded-t-lg sm:top-1/2 sm:left-1/2 sm:max-h-[90dvh] sm:w-[min(520px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg"
        >
          <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4 sm:px-6">
            <div>
              <D.Title className="text-title-sm font-[650] text-ink">{title}</D.Title>
              {description ? <D.Description className="mt-1 text-sm text-ink-secondary">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
            </div>
            <D.Close aria-label="Close" className="-mr-2 grid size-11 place-items-center rounded-full text-ink-hint hover:bg-surface-hover hover:text-ink">
              <Icon name="no" size={18} />
            </D.Close>
          </div>
          <div className="px-5 py-5 sm:px-6">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
