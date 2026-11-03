import Link from "next/link";
import { Icon } from "@/components/icons";
import { Notice } from "@/components/ui/notice";
import type { ScholarshipDetail } from "@/lib/data/scholarships";
import { criteriaItems, type Evaluation } from "@/lib/eligibility";
import { formatDate, plural, shortProvider, urgency } from "@/lib/format";
import { providerTypeLabel } from "@/lib/reference";
import { MatchPill, Pill, ProviderMark } from "./bits";
import { DocumentChecklist } from "./checklist";
import { CriteriaList } from "./criteria";
import { DetailActions } from "./detail-actions";

type Props = {
  s: ScholarshipDetail;
  state: { status: string; days_left: number | null; days_to_open: number | null };
  evaluation: Evaluation | null;
  application: { stage: "saved" | "preparing" | "submitted"; checked: string[] } | null;
  viewer: { signedIn: boolean; isStudent: boolean };
  /** In the explore side panel: smaller headings, title links to the full page. */
  compact?: boolean;
};

function Section({ title, compact, id, children }: { title: string; compact?: boolean; id: string; children: React.ReactNode }) {
  const H = compact ? "h3" : "h2";
  return (
    <section aria-labelledby={id} className="border-t border-hairline px-5 py-6 sm:px-6">
      <H id={id} className="mb-4 text-title-sm font-[650] text-ink sm:text-title">
        {title}
      </H>
      {children}
    </section>
  );
}

export function DetailBody({ s, state, evaluation, application, viewer, compact = false }: Props) {
  const provider = s.provider!;
  const Title = compact ? "h2" : "h1";
  const left =
    state.status === "open"
      ? state.days_left === 0
        ? "Today"
        : plural(state.days_left ?? 0, "day")
      : state.status === "upcoming"
        ? `Opens in ${plural(state.days_to_open ?? 0, "day")}`
        : "Closed";
  const urgent = urgency(state.status, state.days_left) === "urgent";
  const checkedDate = s.last_verified_at ?? s.updated_at;
  const sid = (part: string) => `${compact ? "p-" : ""}${part}-${s.slug}`;

  return (
    <>
      <div className="px-5 pt-6 pb-6 sm:px-6">
        {s.verification !== "verified" ? (
          <div className="mb-4">
            <Notice tone="warn">
              <strong>Not yet verified.</strong> Source: {s.source_label}. Confirm with {shortProvider(provider.name)} before spending on
              documents.
            </Notice>
          </div>
        ) : null}
        <div className="flex items-start gap-4">
          <ProviderMark abbr={provider.abbr} color={provider.color} size={compact ? "md" : "lg"} />
          <div className="min-w-0">
            <Title className={`${compact ? "text-title" : "text-headline-sm sm:text-headline"} font-bold tracking-tight text-ink`}>
              {compact ? (
                <Link href={`/s/${s.slug}`} className="text-ink">
                  {s.name}
                </Link>
              ) : (
                s.name
              )}
            </Title>
            <p className="mt-1 text-ink-secondary">{provider.name}</p>
            {s.location_label ? (
              <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-hint">
                <Icon name="pin" size={15} /> {s.location_label}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Pill tone="strong" icon="peso">{s.amount_text}</Pill>
          <Pill icon="building">{providerTypeLabel[provider.type]}</Pill>
          <MatchPill verdict={evaluation?.verdict} />
          {s.verification === "verified" && s.last_verified_at ? (
            <Pill icon="shield">Verified {formatDate(s.last_verified_at.slice(0, 10))}</Pill>
          ) : null}
          {s.is_sample ? <Pill>Sample listing</Pill> : null}
        </div>
        <DetailActions
          scholarshipId={s.id}
          slug={s.slug}
          stage={application?.stage ?? null}
          status={state.status}
          sourceUrl={s.source_url}
          signedIn={viewer.signedIn}
          isStudent={viewer.isStudent}
        />
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-hairline pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-caption text-ink-hint">Applications open</dt>
            <dd className="text-sm font-semibold text-ink">{s.opens_on ? formatDate(s.opens_on, true) : "To be announced"}</dd>
          </div>
          <div>
            <dt className="text-caption text-ink-hint">Deadline</dt>
            <dd className="text-sm font-semibold text-ink">{s.closes_on ? formatDate(s.closes_on, true) : "To be announced"}</dd>
          </div>
          <div>
            <dt className="text-caption text-ink-hint">Time left</dt>
            <dd className={`text-sm font-semibold ${urgent ? "text-danger" : "text-ink"}`}>{left}</dd>
          </div>
        </dl>
      </div>

      <Section title="Do you qualify?" compact={compact} id={sid("qualify")}>
        <CriteriaList
          evaluation={evaluation}
          requirements={criteriaItems(s.criteria)}
          notes={s.notes.map((n) => n.text)}
          providerName={shortProvider(provider.name)}
          signedIn={viewer.signedIn}
        />
      </Section>

      <Section title="About this scholarship" compact={compact} id={sid("about")}>
        {s.summary ? <p className="max-w-[70ch] text-ink">{s.summary}</p> : null}
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-base sm:grid-cols-[170px_minmax(0,1fr)]">
          {s.benefits.length ? (
            <>
              <dt className="text-ink-hint">What you get</dt>
              <dd>
                <ul className="list-disc pl-5">
                  {s.benefits.map((b) => (
                    <li key={b.position}>{b.text}</li>
                  ))}
                </ul>
              </dd>
            </>
          ) : null}
          {s.duration ? (
            <>
              <dt className="text-ink-hint">Duration</dt>
              <dd>{s.duration}</dd>
            </>
          ) : null}
          {s.renewal ? (
            <>
              <dt className="text-ink-hint">To keep it</dt>
              <dd>{s.renewal}</dd>
            </>
          ) : null}
          {s.obligations ? (
            <>
              <dt className="text-ink-hint">Obligations</dt>
              <dd>{s.obligations}</dd>
            </>
          ) : null}
        </dl>
      </Section>

      {s.documents.length ? (
        <Section title="Documents to prepare" compact={compact} id={sid("documents")}>
          <DocumentChecklist
            scholarshipId={s.id}
            slug={s.slug}
            docs={s.documents}
            checked={application?.checked ?? []}
            canTrack={viewer.isStudent}
            tracked={Boolean(application)}
          />
        </Section>
      ) : null}

      {s.steps.length ? (
        <Section title="How to apply" compact={compact} id={sid("steps")}>
          <ol className="flex flex-col">
            {s.steps.map((step, i) => (
              <li key={step.position} className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
                <span className="grid size-[26px] place-items-center rounded-full bg-primary-wash text-caption font-bold text-primary">{i + 1}</span>
                {i < s.steps.length - 1 ? <span aria-hidden="true" className="absolute top-8 bottom-1 left-3 w-0.5 bg-hairline" /> : null}
                <div className="pt-0.5">
                  <p className="font-semibold text-ink">{step.title}</p>
                  {step.detail ? <p className="text-sm text-ink-secondary">{step.detail}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      <p className="border-t border-hairline px-5 py-5 text-sm text-ink-secondary sm:px-6">
        Source:{" "}
        {s.source_url ? (
          <a href={s.source_url} target="_blank" rel="noopener noreferrer">
            {s.source_label}
          </a>
        ) : (
          s.source_label
        )}
        . Last checked {formatDate(checkedDate.slice(0, 10), true)}. Questions?{" "}
        <Link href={`/help?about=${s.id}`}>Ask the scholarship office</Link>.
      </p>
    </>
  );
}
