"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Drawer, useUrlPanel, WIDE_QUERY } from "@/components/ui/drawer";

/**
 * List + detail split view (Find scholarships, My applications). A click on a link with data-slug shows
 * it beside the list on wide screens (?s=slug) or in a drawer on narrower ones (?s=slug&d=1, Back closes it).
 */
export function SplitLinks({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const drawer = useUrlPanel("d");
  const [pending, start] = useTransition();
  return (
    <div
      aria-busy={pending || undefined}
      className={pending ? "opacity-70 transition-opacity" : undefined}
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-slug]");
        if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        const slug = a.dataset.slug!;
        if (matchMedia(WIDE_QUERY).matches) start(() => router.replace(drawer.hrefWith({ s: slug, d: null }), { scroll: false }));
        else start(() => drawer.open("1", { s: slug }, a));
      }}
    >
      {children}
    </div>
  );
}

/** The selected scholarship in a drawer over the list (narrow screens). */
export function DetailDrawer({ slug, name, children }: { slug: string; name: string; children: React.ReactNode }) {
  const drawer = useUrlPanel("d");
  return (
    <Drawer
      open={drawer.isOpen}
      onClose={drawer.close}
      title={name}
      titleHidden
      width="wide"
      footer={
        <Link href={`/s/${slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-3">
          Open the full page
        </Link>
      }
    >
      {children}
    </Drawer>
  );
}
