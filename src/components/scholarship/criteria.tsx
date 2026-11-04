import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { Notice } from "@/components/ui/notice";
import { DISCLAIMER, haveText, requirementLabel, stepFor, verdictSentence, type EligibilityItem, type Evaluation } from "@/lib/eligibility";

const ROW: Record<string, { disc: string; icon: IconName; word: string; wordTone: string; haveTone: string }> = {
  met: { disc: "bg-ok text-white", icon: "yes", word: "Met", wordTone: "text-ok", haveTone: "text-ink-secondary" },
  not_met: { disc: "bg-danger text-white", icon: "no", word: "Not met", wordTone: "text-danger", haveTone: "text-danger" },
  unknown: { disc: "bg-warn-wash text-warn ring-1 ring-warn", icon: "q", word: "Unknown", wordTone: "text-warn", haveTone: "text-ink-secondary" },
};
const BANNER = { yes: "bg-ok-wash text-ok", maybe: "bg-warn-wash text-warn", no: "bg-danger-wash text-danger" } as const;

function Disc({ cls, icon }: { cls: string; icon: IconName }) {
  return (
    <span className={`mt-0.5 grid size-[22px] place-items-center rounded-full ${cls}`}>
      <Icon name={icon} size={13} strokeWidth={3} />
    </span>
  );
}

/** One bordered list of requirements: status disc, label, the student's own value, status word. */
export function RequirementRows({ items, answered }: { items: EligibilityItem[]; answered: boolean }) {
  return (
    <ul className="overflow-hidden rounded-md border border-hairline" aria-label="Requirements we can check">
      {items.map((item) => {
        const row = answered ? ROW[item.status]! : null;
        return (
          <li key={item.kind} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-start gap-3 border-t border-hairline px-4 py-3 first:border-t-0">
            {row ? <Disc cls={row.disc} icon={row.icon} /> : <Disc cls="bg-surface-subtle text-ink-hint ring-1 ring-hairline-strong" icon="doc" />}
            <div className="min-w-0">
              <p className="text-base font-semibold text-ink">{requirementLabel(item)}</p>
              {row ? <p className={`text-sm ${row.haveTone}`}>{haveText(item)}</p> : null}
            </div>
            {row ? <span className={`pt-0.5 text-caption font-semibold whitespace-nowrap ${row.wordTone}`}>{row.word}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

/** The explainable eligibility check: verdict banner, one row per requirement, self-checks, disclaimer. */
export function CriteriaList({
  evaluation,
  requirements,
  notes,
  providerName,
  signedIn,
}: {
  evaluation: Evaluation | null;
  /** The listing's requirements, shown when there's no evaluation to explain them against. */
  requirements: EligibilityItem[];
  notes: string[];
  providerName: string;
  signedIn: boolean;
}) {
  const answered = evaluation && evaluation.verdict !== "none";
  const items = answered ? evaluation.items : requirements;
  const firstUnknown = items.find((i) => i.status === "unknown");

  return (
    <div className="flex flex-col gap-4">
      {!answered ? (
        <Notice>
          Answer a few questions to see which requirements you meet.{" "}
          <Link href={signedIn ? "/check" : "/signup"} className="font-semibold">
            {signedIn ? "Check my eligibility" : "Create an account to check"}
          </Link>
        </Notice>
      ) : (
        <div className={`flex flex-wrap items-center gap-3 rounded-sm px-4 py-3 font-semibold ${BANNER[evaluation.verdict as "yes" | "maybe" | "no"]}`}>
          <Icon name={evaluation.verdict === "yes" ? "yes" : evaluation.verdict === "no" ? "no" : "q"} size={20} strokeWidth={2.2} />
          <span className="flex-1">{verdictSentence(evaluation)}</span>
          {firstUnknown ? (
            <Link
              href={`/check?step=${stepFor(firstUnknown)}`}
              className="inline-flex min-h-11 items-center rounded-sm border border-hairline-strong bg-surface px-3 text-sm text-ink no-underline hover:bg-surface-hover nav:min-h-9"
            >
              Answer now
            </Link>
          ) : null}
        </div>
      )}

      {items.length > 0 ? <RequirementRows items={items} answered={Boolean(answered)} /> : null}

      {notes.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-secondary">Also required (confirm these yourself)</p>
          <ul className="overflow-hidden rounded-md border border-hairline">
            {notes.map((n) => (
              <li key={n} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-start gap-3 border-t border-hairline px-4 py-3 first:border-t-0">
                <Disc cls="bg-surface-subtle text-ink-hint ring-1 ring-hairline-strong" icon="doc" />
                <p className="text-base font-semibold text-ink">{n}</p>
                <span className="pt-0.5 text-caption font-semibold whitespace-nowrap text-ink-hint">Self-check</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-caption text-ink-hint">
        {DISCLAIMER} {providerName} makes the final call.
      </p>
    </div>
  );
}
