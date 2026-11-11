"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export function ShareButton({ slug, name, icon = "share", className = "" }: { slug: string; name: string; icon?: "share" | "shareNodes"; className?: string }) {
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      toast("Select the link to copy it manually.", "danger");
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        type="button"
        aria-label="Share"
        aria-haspopup="dialog"
        className={`min-w-11 ${className}`}
        onClick={() => {
          setCopied(false);
          setUrl(new URL(`/s/${encodeURIComponent(slug)}`, window.location.origin).href);
        }}
      >
        <Icon name={icon} size={18} />
      </Button>
      <Dialog
        open={Boolean(url)}
        onOpenChange={(open) => { if (!open) setUrl(""); }}
        title="Share scholarship"
        description={name}
      >
        <figure className="flex flex-col items-center gap-5 pb-6 pt-2">
          <QRCodeSVG value={url} size={216} marginSize={4} fgColor="#181818" title="Public scholarship link" />
          <figcaption className="text-center text-caption text-ink-secondary">Scan to open the public scholarship listing</figcaption>
        </figure>
        <div className="flex gap-2">
          <input
            aria-label="Public scholarship link"
            className="min-w-0 flex-1 rounded-sm border border-hairline bg-surface-hover px-3 text-sm text-ink"
            value={url}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button type="button" onClick={copyLink}>
            <Icon name="copy" size={16} /> {copied ? "Copied" : "Copy link"}
          </Button>
          <span className="sr-only" role="status">{copied ? "Link copied" : ""}</span>
        </div>
      </Dialog>
    </>
  );
}
