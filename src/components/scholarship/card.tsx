import Link from "next/link";
import { Icon } from "@/components/icons";
import { reasonLine, type EligibilityItem } from "@/lib/eligibility";
import { ago, shortProvider } from "@/lib/format";
import { providerTypeLabel, type ProviderType } from "@/lib/reference";
import { DueText, MatchPill, Pill, ProviderMark, TrustPills } from "./bits";
import { SaveButton } from "./save-button";

export type CardData = {
  id: string;
  slug: string;
  name: string;
  provider_name: string;
  provider_abbr: string;
  provider_color: string;
  provider_type: ProviderType;
  amount_text: string;
  status: string;
  days_left: number | null;
  opens_on: string | null;
  closes_on: string | null;
  location_label: string | null;
  verification: string;
  published_at: string | null;
  is_sample: boolean;
  verdict?: string | null;
  first_gap?: unknown;
};

/**
 * A scholarship in a list. The title link stretches over the card; the save button sits above it.
 * `compact` drops type, location and posted date (dashboard recommendations).
 */
export function ScholarshipCard({
  s,
  stage = null,
  signedIn,
  compact = false,
  reason = false,
  selected = false,
  href,
}: {
  s: CardData;
  stage?: "saved" | "preparing" | "submitted" | null;
  signedIn: boolean;
  compact?: boolean;
  reason?: boolean;
  selected?: boolean;
  href?: string;
}) {
  const why = reason && (s.verdict === "no" || s.verdict === "maybe") ? reasonLine(s.first_gap as EligibilityItem | null) : null;
  return (
    <article
      data-testid="scholarship-card"
      className={`relative grid grid-cols-[auto_minmax(0,1fr)] gap-4 rounded-md border bg-surface p-4 shadow-rest transition-colors duration-150 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary sm:p-5 ${
        selected ? "border-primary ring-1 ring-primary" : "border-hairline hover:border-hairline-strong"
      }`}
    >
      <ProviderMark abbr={s.provider_abbr} color={s.provider_color} size={compact ? "sm" : "md"} />
      <div className="min-w-0">
        <h3 className="pr-10 text-base leading-snug font-semibold text-ink">
          <Link
            href={href ?? `/s/${s.slug}`}
            data-slug={s.slug}
            className="text-ink no-underline outline-none after:absolute after:inset-0 after:rounded-md after:content-[''] hover:underline"
          >
            {s.name}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-sm text-ink-secondary">{shortProvider(s.provider_name)}</p>
        {!compact && s.location_label ? (
          <p className="mt-0.5 flex items-center gap-1 text-caption text-ink-hint">
            <Icon name="pin" size={14} />
            <span className="truncate">{s.location_label}</span>
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Pill tone="strong">{s.amount_text}</Pill>
          {!compact ? <Pill>{providerTypeLabel[s.provider_type]}</Pill> : null}
          <MatchPill verdict={s.verdict} />
          <TrustPills verification={s.verification} isSample={s.is_sample} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <DueText s={s} />
          {!compact && s.published_at ? <span className="text-caption text-ink-hint">Posted {ago(s.published_at)}</span> : null}
        </div>
        {why ? (
          <p className="mt-3 flex gap-2 border-t border-dashed border-hairline pt-3 text-caption text-ink-secondary">
            <Icon name="info" size={15} className="mt-0.5" />
            <span>{why}</span>
          </p>
        ) : null}
      </div>
      <SaveButton scholarshipId={s.id} slug={s.slug} name={s.name} stage={stage} signedIn={signedIn} />
    </article>
  );
}
