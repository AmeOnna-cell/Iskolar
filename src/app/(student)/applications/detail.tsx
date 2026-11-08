import Link from "next/link";
import { Icon } from "@/components/icons";
import { DueText, MatchPill, Pill, ProviderMark, SamplePill } from "@/components/scholarship/bits";
import { DocumentChecklist } from "@/components/scholarship/checklist";
import { CriteriaList } from "@/components/scholarship/criteria";
import { Section, Steps } from "@/components/scholarship/detail-body";
import { ShareButton } from "@/components/scholarship/share-button";
import { buttonClass } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { statusOf, type ScholarshipDetail } from "@/lib/data/scholarships";
import type { ApplicationRow } from "@/lib/data/student";
import { criteriaItems, type Evaluation } from "@/lib/eligibility";
import { formatDate, shortProvider, todayPH } from "@/lib/format";
import { providerTypeLabel } from "@/lib/reference";
import { RowControl } from "./row-control";

/** The selected application: who and when, the stage control, then the checklist, how to apply and requirements. */
export function ApplicationDetail({ s, app, evaluation }: { s: ScholarshipDetail; app: ApplicationRow; evaluation: Evaluation | null }) {
  const provider = s.provider!;
  const checked = app.checked.map((c) => c.document_id);
  const docsDone = s.documents.filter((d) => checked.includes(d.id)).length;
  const sid = (part: string) => `a-${part}-${s.slug}`;
  const st = statusOf(s, todayPH());
  const date = (iso: string | null) => (iso ? formatDate(iso.slice(0, 10), true) : "To be announced");

  return (
    <>
      <div className="border-b border-hairline px-4 py-4 sm:px-6" data-testid="panel-header">
        <div className="flex items-start gap-4">
          <ProviderMark abbr={provider.abbr} color={provider.color} />
          <div className="min-w-0 flex-1">
            <h2 className="text-title font-[650] tracking-tight text-ink">
              <Link href={`/s/${s.slug}`} className="text-ink">
                {s.name}
              </Link>
            </h2>
            <p className="text-ink-secondary">{provider.name}</p>
            <DueText s={{ ...st, opens_on: s.opens_on, closes_on: s.closes_on }} size="sm" className="mt-1 block" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <MatchPill verdict={evaluation?.verdict} />
          <Pill icon="building">{providerTypeLabel[provider.type]}</Pill>
          {s.is_sample ? (
            <SamplePill />
          ) : s.verification === "verified" ? (
            <Pill icon="shield">Source checked {formatDate((s.last_verified_at ?? s.updated_at).slice(0, 10), true)}</Pill>
          ) : (
            <Pill tone="warn" icon="warn">Unverified</Pill>
          )}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-hairline pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-caption text-ink-hint">Applications open</dt>
            <dd className="text-sm font-semibold text-ink">{date(s.opens_on)}</dd>
          </div>
          <div>
            <dt className="text-caption text-ink-hint">Deadline</dt>
            <dd className="text-sm font-semibold text-ink">{date(s.closes_on)}</dd>
          </div>
          <div>
            <dt className="text-caption text-ink-hint">Last updated</dt>
            <dd className="text-sm font-semibold text-ink">{date(s.updated_at)}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {s.source_url ? (
            <a href={s.source_url} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "md")}>
              Official source <Icon name="ext" size={16} />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : null}
          <ShareButton slug={s.slug} name={s.name} sample={s.is_sample} />
        </div>
        <div className="mt-4 rounded-md bg-surface-subtle px-3 py-3">
          <p className="mb-2 text-caption text-ink-hint">Your application</p>
          <RowControl applicationId={app.id} scholarshipId={s.id} name={s.name} stage={app.stage} result={app.result} docsDone={docsDone} docsTotal={s.documents.length} />
          {app.result === "approved" && s.renewal ? (
            <p className="mt-3 rounded-sm bg-ok-wash px-3 py-2 text-sm text-ok">To keep it: {s.renewal} We&apos;ll remind you when renewal opens.</p>
          ) : app.result === "rejected" ? (
            <p className="mt-3 text-sm text-ink-secondary">
              Not this time. Many students apply to several programs: <Link href="/explore?status=open" className="font-semibold">see what&apos;s still open</Link>.
            </p>
          ) : null}
        </div>
        {/* Trust is visible: warn before a student spends on documents for a listing nobody has checked. */}
        {!s.is_sample && s.verification !== "verified" ? (
          <div className="mt-4">
            <Notice tone="warn">
              <strong>Not yet verified.</strong> Source: {s.source_label}. Confirm with {shortProvider(provider.name)} before spending on documents.
            </Notice>
          </div>
        ) : null}
      </div>

      {s.documents.length ? (
        <Section title="Documents to prepare" compact id={sid("documents")}>
          <DocumentChecklist scholarshipId={s.id} slug={s.slug} docs={s.documents} checked={checked} canTrack tracked />
        </Section>
      ) : null}

      {s.steps.length ? (
        <Section title="How to apply" compact id={sid("steps")}>
          <Steps steps={s.steps} />
        </Section>
      ) : null}

      <Section title="Requirements" compact id={sid("requirements")}>
        <CriteriaList
          evaluation={evaluation}
          requirements={criteriaItems(s.criteria)}
          notes={s.notes.map((n) => n.text)}
          providerName={shortProvider(provider.name)}
          signedIn
        />
      </Section>
    </>
  );
}
