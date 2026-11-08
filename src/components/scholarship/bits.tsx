import { Icon, type IconName } from "@/components/icons";
import { dueText, urgency } from "@/lib/format";
import type { Verdict } from "@/lib/eligibility";

/** Provider tile: 2–4 letter abbreviation in the provider's own colour (DESIGN.md Shapes). */
export function ProviderMark({ abbr, color, size = "md" }: { abbr: string; color: string; size?: "sm" | "md" | "lg" }) {
  const long = abbr.length > 3;
  // Four-letter marks (OWWA, CHED, DOST) drop to the 11px floor so they fit the small tiles.
  const box =
    size === "lg"
      ? "size-15 rounded-md text-sm"
      : size === "sm"
        ? `rounded-sm ${long ? "size-10 text-[11px]" : "size-9 text-tab"}`
        : `size-11 rounded-md ${long ? "text-[11px]" : "text-tab"}`;
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center font-bold text-white ${long ? "tracking-tight" : "tracking-wide"} ${box}`}
      style={{ backgroundColor: color }}
    >
      {abbr}
    </span>
  );
}

type Tone = "neutral" | "strong" | "ok" | "warn" | "danger" | "info";
const PILL: Record<Tone, string> = {
  neutral: "border border-hairline bg-surface-subtle text-ink-secondary",
  strong: "border border-hairline bg-surface-subtle font-semibold text-ink",
  ok: "bg-ok-wash text-ok",
  warn: "bg-warn-wash text-warn",
  danger: "bg-danger-wash text-danger",
  info: "bg-primary-wash text-primary",
};

export function Pill({ tone = "neutral", icon, children }: { tone?: Tone; icon?: IconName; children: React.ReactNode }) {
  return (
    <span className={`inline-flex h-[26px] shrink-0 items-center gap-1 rounded-full px-2.5 text-caption font-medium whitespace-nowrap ${PILL[tone]}`}>
      {icon ? <Icon name={icon} size={14} strokeWidth={2.2} /> : null}
      {children}
    </span>
  );
}

export function MatchPill({ verdict }: { verdict: Verdict | string | null | undefined }) {
  if (verdict === "yes") return <Pill tone="ok" icon="yes">You qualify</Pill>;
  if (verdict === "maybe") return <Pill tone="warn" icon="q">Might qualify</Pill>;
  if (verdict === "no") return <Pill tone="danger" icon="no">Not eligible right now</Pill>;
  return null;
}

/** Sample (seeded example) rows are never presented as verified, or as unverified real listings. */
export function TrustPills({ verification, isSample }: { verification: string; isSample: boolean }) {
  if (isSample) return <SamplePill />;
  return verification !== "verified" ? <Pill tone="warn" icon="warn">Unverified</Pill> : null;
}

export function SamplePill() {
  return <Pill tone="info" icon="info">Sample listing</Pill>;
}

/** The Urgency Ladder: red at ≤3 days, amber at ≤7, neutral otherwise. */
export const DUE_TONE = { urgent: "text-danger", soon: "text-warn", none: "text-ink-secondary" } as const;

export function DueText({
  s,
  size = "caption",
  className = "",
}: {
  s: { status: string; days_left: number | null; opens_on: string | null; closes_on: string | null };
  size?: "caption" | "sm";
  className?: string;
}) {
  return <span className={`${size === "sm" ? "text-sm" : "text-caption"} font-semibold ${DUE_TONE[urgency(s.status, s.days_left)]} ${className}`}>{dueText(s)}</span>;
}

/** Progress meter; turns green when complete. */
export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-1.5 w-full overflow-hidden rounded-full border border-hairline bg-surface-subtle"
    >
      <div className={`h-full transition-[width] duration-200 ${pct === 100 ? "bg-ok" : "bg-primary"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
