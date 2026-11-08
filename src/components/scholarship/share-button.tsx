"use client";

import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Shares the scholarship's own page: the system share sheet where there is one, otherwise copies the link. */
export function ShareButton({ slug, name, sample = false, className = "" }: { slug: string; name: string; sample?: boolean; className?: string }) {
  const toast = useToast();
  const share = async () => {
    const url = new URL(`/s/${slug}`, window.location.origin).href;
    if (navigator.share) {
      try {
        await navigator.share({ title: sample ? `${name} (sample listing)` : name, url });
        return;
      } catch (e) {
        if ((e as DOMException).name === "AbortError") return; // closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied", "ok");
    } catch {
      toast("We couldn't copy the link. Copy it from the address bar instead.", "danger");
    }
  };
  return (
    <Button variant="outline" onClick={share} className={className}>
      <Icon name="share" size={18} /> Share
    </Button>
  );
}
