"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "@/app/(auth)/actions";
import { Icon } from "@/components/icons";
import { getQueryClient } from "@/components/providers";

/**
 * Sign out on the server (clears the session cookies), drop every cached query, then
 * router.replace("/login") so the private page isn't kept in history as a Forward target.
 */
export function useSignOut() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      await signOut();
      getQueryClient().clear();
      router.replace("/login?signedOut=1");
      router.refresh();
    });
  return { run, pending };
}

export function SignOutItem() {
  const { run, pending } = useSignOut();
  return (
    <Menu.Item
      onSelect={(e) => {
        e.preventDefault();
        run();
      }}
      disabled={pending}
      className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-sm px-3 text-sm text-ink outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-hover"
    >
      <Icon name="logout" size={18} className="text-ink-hint" />
      {pending ? "Signing out…" : "Sign out"}
    </Menu.Item>
  );
}
