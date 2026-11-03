import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

type Tone = "info" | "warn" | "danger" | "ok";

const tones: Record<Tone, { box: string; icon: string; name: IconName }> = {
  info: { box: "bg-primary-wash", icon: "text-primary", name: "info" },
  warn: { box: "bg-warn-wash", icon: "text-warn", name: "warn" },
  danger: { box: "bg-danger-wash", icon: "text-danger", name: "warn" },
  ok: { box: "bg-ok-wash", icon: "text-ok", name: "yes" },
};

/** Inline message. role="alert" for errors that appear after an action, otherwise role="status". */
export function Notice({ tone = "info", children, live = false }: { tone?: Tone; children: ReactNode; live?: boolean }) {
  const t = tones[tone];
  return (
    <div
      role={live ? (tone === "danger" ? "alert" : "status") : undefined}
      className={`flex gap-3 rounded-sm px-4 py-3 text-sm text-ink ${t.box}`}
    >
      <Icon name={t.name} size={18} className={`mt-0.5 ${t.icon}`} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
