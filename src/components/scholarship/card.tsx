import Link from "next/link";
import { Icon } from "@/components/icons";
import { reasonLine, type EligibilityItem } from "@/lib/eligibility";
import { ago, shortProvider, splitAmount } from "@/lib/format";
import { providerTypeLabel, type ProviderType } from "@/lib/reference";
import { DueText, MatchPill, ProviderMark, TrustPills } from "./bits";
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
 * A scholarship in a list (team-leader card): mark, name and provider with the save button top-right;
 * the amount large with its period; where it applies and the provider type; the verdict and trust
 * pills; then a ruled footer with the deadline (urgency colour) and when it was posted.
 * The title link stretches over the card; the save button sits above it. "Might qualify" and
 * "Not eligible" carry their reason when `reason` is set. `compact` uses the smaller mark.
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
  const amount = splitAmount(s.amount_text);
  const hasPills = Boolean(s.verdict && s.verdict !== "unknown") || s.is_sample || s.verification !== "verified";
  return (
    <article
      data-testid="scholarship-card"
      className={`relative rounded-md border bg-surface p-4 shadow-rest transition-colors duration-150 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary sm:p-5 ${
        // The selected ring marks the card shown in the side panel, which exists only from 1000px (lg).
        selected ? "border-hairline hover:border-hairline-strong lg:border-primary lg:ring-1 lg:ring-primary" : "border-hairline hover:border-hairline-strong"
      }`}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 pr-10">
        <ProviderMark abbr={s.provider_abbr} color={s.provider_color} size={compact ? "sm" : "md"} />
        <div className="min-w-0">
          <h3 className="text-base leading-snug font-semibold text-ink">
            <Link
              href={href ?? `/s/${s.slug}`}
              data-slug={s.slug}
              className="text-ink no-underline outline-none after:absolute after:inset-0 after:rounded-md after:content-[''] hover:underline"
            >
              {s.name}
            </Link>
          </h3>
          <p className="truncate text-sm text-ink-secondary">{shortProvider(s.provider_name)}</p>
        </div>
      </div>

      <p className="mt-3 text-title leading-tight font-bold tracking-tight text-ink" data-testid="card-amount">
        {amount.main}
        {amount.period ? <span className="text-sm font-medium tracking-normal text-ink-secondary"> {amount.period}</span> : null}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink-secondary">
        {s.location_label ? (
          <span className="inline-flex min-w-0 items-start gap-1">
            <Icon name="pin" size={15} className="mt-[3px] shrink-0 text-ink-hint" />
            <span className="min-w-0 [overflow-wrap:anywhere]">{s.location_label}</span>
          </span>
        ) : null}
        <span className="rounded-sm border border-hairline px-1.5 leading-5">{providerTypeLabel[s.provider_type]}</span>
      </p>

      {hasPills ? (
        <div className="mt-3 flex flex-wrap gap-2" data-testid="decision-line">
          <MatchPill verdict={s.verdict} />
          <TrustPills verification={s.verification} isSample={s.is_sample} />
        </div>
      ) : null}
      {why ? (
        <p className="mt-2 flex gap-2 text-caption text-ink-secondary">
          <Icon name="info" size={15} className="mt-0.5 shrink-0" />
          <span>{why}</span>
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-hairline pt-3">
        <DueText s={s} size="sm" />
        {s.published_at ? <span className="text-caption text-ink-hint">Posted {ago(s.published_at)}</span> : null}
      </div>
      <SaveButton scholarshipId={s.id} slug={s.slug} name={s.name} stage={stage} signedIn={signedIn} />
    </article>
  );
}
