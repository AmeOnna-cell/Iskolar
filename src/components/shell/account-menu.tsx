"use client";

import Link from "next/link";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Icon, type IconName } from "@/components/icons";
import type { Viewer } from "@/lib/nav";

type Props = { viewer: NonNullable<Viewer>; signOut: React.ReactNode };

const itemClass =
  "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-sm px-3 text-sm text-ink no-underline outline-none data-[highlighted]:bg-surface-hover";

function Item({ href, icon, children }: { href: string; icon: IconName; children: React.ReactNode }) {
  return (
    <Menu.Item asChild>
      <Link href={href} className={itemClass}>
        <Icon name={icon} size={18} className="text-ink-hint" />
        {children}
      </Link>
    </Menu.Item>
  );
}

export function AccountMenu({ viewer, signOut }: Props) {
  const initial = (viewer.name?.trim()[0] ?? viewer.email[0] ?? "S").toUpperCase();
  const isStaff = viewer.role !== "student";
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Account menu"
        className="ml-1 grid size-11 place-items-center rounded-full outline-none hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="grid size-9 place-items-center rounded-full bg-primary-wash text-sm font-bold text-primary">
          {initial}
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={8}
          className="z-40 w-[272px] rounded-md border border-hairline bg-surface p-2 shadow-overlay"
        >
          <div className="mb-2 border-b border-hairline px-3 pt-2 pb-3">
            <p className="truncate text-sm font-semibold text-ink">{viewer.name || viewer.email}</p>
            <p className="truncate text-caption text-ink-secondary">
              {viewer.subtitle || (isStaff ? (viewer.role === "admin" ? "Admin" : "Coordinator") : viewer.email)}
            </p>
          </div>
          {isStaff ? (
            <>
              <Item href="/staff" icon="shield">Scholarship office view</Item>
              {viewer.role === "admin" ? <Item href="/admin/audit" icon="list">Audit log</Item> : null}
            </>
          ) : (
            <>
              <Item href="/check" icon="edit">Edit eligibility answers</Item>
              <Item href="/alerts" icon="bell">Alerts</Item>
            </>
          )}
          <Item href="/settings" icon="settings">Settings</Item>
          <Item href="/help" icon="help">Help and FAQ</Item>
          <Menu.Separator className="my-2 h-px bg-hairline" />
          {signOut}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
