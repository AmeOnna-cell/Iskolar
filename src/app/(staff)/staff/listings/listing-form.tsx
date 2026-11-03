"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { useToast } from "@/components/ui/toast";
import { saveListing } from "@/lib/actions/staff";
import { FIELDS, PROVIDER_TYPES, REGIONS } from "@/lib/reference";
import type { ListingInput } from "@/lib/validation/listing";

type Option = { id: string; label: string };
type Item = Record<string, string> & { key: string };

let seq = 0;
const k = () => `n${++seq}`;

const field = `${inputClass} border-hairline-strong`;

function L({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: React.ReactNode; htmlFor: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {hint ? <p className="-mt-1 text-caption text-ink-hint">{hint}</p> : null}
      {children}
      {error ? <p className="text-caption font-semibold text-danger" role="alert">{error}</p> : null}
    </div>
  );
}

function Fieldset({ legend, hint, children }: { legend: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-5 rounded-md border border-hairline bg-surface p-5 shadow-rest sm:p-6">
      <legend className="sr-only">{legend}</legend>
      <div>
        <h2 className="text-title-sm font-[650] text-ink">{legend}</h2>
        {hint ? <p className="mt-1 text-sm text-ink-secondary">{hint}</p> : null}
      </div>
      {children}
    </fieldset>
  );
}

/** Repeatable list (benefits, documents, steps, notes) with add, remove and reorder. */
function ListEditor({
  name,
  items,
  setItems,
  fields,
  addLabel,
  errors,
}: {
  name: string;
  items: Item[];
  setItems: (items: Item[]) => void;
  fields: Array<{ key: string; label: string; wide?: boolean; max: number }>;
  addLabel: string;
  errors: Record<string, string>;
}) {
  const move = (i: number, d: number) => {
    const n = [...items];
    [n[i], n[i + d]] = [n[i + d]!, n[i]!];
    setItems(n);
  };
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? <p className="text-sm text-ink-hint">None yet.</p> : null}
      <ol className="flex flex-col gap-3">
        {items.map((item, i) => (
          <li key={item.key} className="grid gap-3 rounded-sm border border-hairline bg-surface-subtle p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className={`grid gap-3 ${fields.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {fields.map((f) => {
                const id = `${name}-${item.key}-${f.key}`;
                const err = errors[`${name}.${i}.${f.key}`];
                return (
                  <L key={f.key} label={`${f.label} ${i + 1}`} htmlFor={id} error={err}>
                    <input id={id} value={item[f.key] ?? ""} maxLength={f.max} onChange={(e) => setItems(items.map((x) => (x.key === item.key ? { ...x, [f.key]: e.target.value } : x)))} className={field} />
                  </L>
                );
              })}
            </div>
            <div className="flex items-end gap-1">
              <Button type="button" variant="outline" size="sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${fields[0]!.label.toLowerCase()} ${i + 1} up`}>
                <Icon name="chevron" size={16} className="rotate-180" />
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${fields[0]!.label.toLowerCase()} ${i + 1} down`}>
                <Icon name="chevron" size={16} />
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setItems(items.filter((x) => x.key !== item.key))} aria-label={`Remove ${fields[0]!.label.toLowerCase()} ${i + 1}`}>
                <Icon name="no" size={16} />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, { key: k(), id: "", ...Object.fromEntries(fields.map((f) => [f.key, ""])) }])}>
          <Icon name="plus" size={16} /> {addLabel}
        </Button>
      </div>
    </div>
  );
}

function CheckGroup({ legend, options, values, onChange }: { legend: string; options: Array<[string, string]>; values: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">{legend}</legend>
      <div className="grid gap-1 sm:grid-cols-2">
        {options.map(([v, l]) => (
          <label key={v} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
            <input type="checkbox" checked={values.includes(v)} onChange={(e) => onChange(e.target.checked ? [...values, v] : values.filter((x) => x !== v))} className="size-[18px] accent-[var(--primary)]" />
            {l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export type FormInitial = Omit<ListingInput, "benefits" | "documents" | "steps" | "notes"> & {
  benefits: Item[];
  documents: Item[];
  steps: Item[];
  notes: Item[];
};

export function ListingForm({
  initial,
  providers,
  coordinators,
  isAdmin,
}: {
  initial: FormInitial;
  providers: Option[];
  coordinators: Option[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [v, setV] = useState(initial);
  const [newProvider, setNewProvider] = useState(!initial.provider_id && providers.length === 0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const set = (patch: Partial<FormInitial>) => setV((x) => ({ ...x, ...patch }));
  const setC = (patch: Partial<FormInitial["criteria"]>) => setV((x) => ({ ...x, criteria: { ...x.criteria, ...patch } }));
  const np = v.new_provider ?? { name: "", short_name: "", abbr: "", color: "#334155", type: "government", website: "" };

  const submit = () =>
    start(async () => {
      // Drop the client-only React key; keep the database id so rows are updated in place.
      const strip = (items: Item[]) => items.map((it) => Object.fromEntries(Object.entries(it).filter(([name]) => name !== "key")));
      const res = await saveListing({
        ...v,
        provider_id: newProvider ? "" : v.provider_id,
        new_provider: newProvider ? np : undefined,
        benefits: strip(v.benefits) as never,
        documents: strip(v.documents) as never,
        steps: strip(v.steps) as never,
        notes: strip(v.notes) as never,
      });
      if (res.status === "error") {
        setErrors(res.fieldErrors ?? {});
        setMessage(res.message ?? "Some fields need attention.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      toast(v.id ? "Listing saved" : "Listing created as a draft");
      router.replace(`/staff/listings/${res.id}?saved=1`);
      router.refresh();
    });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-6"
    >
      {message ? (
        <Notice tone="danger" live>
          {message}
          {Object.keys(errors).length ? ` (${Object.keys(errors).length} ${Object.keys(errors).length === 1 ? "field" : "fields"})` : ""}
        </Notice>
      ) : null}

      <Fieldset legend="Basics">
        <L label="Scholarship name" htmlFor="f-name" error={errors.name}>
          <input id="f-name" value={v.name} maxLength={160} onChange={(e) => set({ name: e.target.value })} className={field} />
        </L>
        <L label="Web address (slug)" hint="Leave empty to make one from the name." htmlFor="f-slug" error={errors.slug}>
          <input id="f-slug" value={v.slug ?? ""} maxLength={80} placeholder="e.g. city-merit-grant" onChange={(e) => set({ slug: e.target.value })} className={field} />
        </L>
        <div className="flex flex-col gap-2">
          {newProvider ? (
            <div className="grid gap-4 rounded-sm border border-hairline bg-surface-subtle p-4 sm:grid-cols-2">
              <L label="Provider name" htmlFor="np-name" error={errors["new_provider.name"]}>
                <input id="np-name" value={np.name} maxLength={160} onChange={(e) => set({ new_provider: { ...np, name: e.target.value } })} className={field} />
              </L>
              <L label="Abbreviation (1–5 letters)" htmlFor="np-abbr" error={errors["new_provider.abbr"]}>
                <input id="np-abbr" value={np.abbr} maxLength={5} onChange={(e) => set({ new_provider: { ...np, abbr: e.target.value } })} className={field} />
              </L>
              <L label="Provider type" htmlFor="np-type">
                <select id="np-type" value={np.type} onChange={(e) => set({ new_provider: { ...np, type: e.target.value } })} className={field}>
                  {PROVIDER_TYPES.map(([t, l]) => (
                    <option key={t} value={t}>{l}</option>
                  ))}
                </select>
              </L>
              <L label="Tile colour" htmlFor="np-color" error={errors["new_provider.color"]}>
                <input id="np-color" type="color" value={np.color} onChange={(e) => set({ new_provider: { ...np, color: e.target.value } })} className="h-11 w-20 rounded-sm border border-hairline-strong bg-surface" />
              </L>
            </div>
          ) : (
            <L label="Provider" htmlFor="f-provider" error={errors.provider_id}>
              <select id="f-provider" value={v.provider_id ?? ""} onChange={(e) => set({ provider_id: e.target.value })} className={field}>
                <option value="">Choose a provider</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </L>
          )}
          <Button type="button" variant="text" onClick={() => setNewProvider((x) => !x)} className="self-start">
            {newProvider ? "Choose an existing provider" : "Add a new provider"}
          </Button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <L label="Amount, as students read it" hint="e.g. ₱15,000 a year" htmlFor="f-amount" error={errors.amount_text}>
            <input id="f-amount" value={v.amount_text} maxLength={120} onChange={(e) => set({ amount_text: e.target.value })} className={field} />
          </L>
          <L label="Yearly value in pesos" hint="For “highest amount” sorting. Optional." htmlFor="f-amount-num" error={errors.amount_num}>
            <input id="f-amount-num" type="number" inputMode="numeric" min={0} value={String(v.amount_num ?? "")} onChange={(e) => set({ amount_num: e.target.value })} className={field} />
          </L>
          <L label="Applications open" htmlFor="f-opens" error={errors.opens_on}>
            <input id="f-opens" type="date" value={v.opens_on} onChange={(e) => set({ opens_on: e.target.value })} className={field} />
          </L>
          <L label="Deadline" hint="Changing it alerts students who track this scholarship." htmlFor="f-closes" error={errors.closes_on}>
            <input id="f-closes" type="date" value={v.closes_on} onChange={(e) => set({ closes_on: e.target.value })} className={field} />
          </L>
          <L label="Where it applies" hint="e.g. Nationwide, or Central Luzon (city residents)" htmlFor="f-loc" error={errors.location_label}>
            <input id="f-loc" value={v.location_label ?? ""} maxLength={120} onChange={(e) => set({ location_label: e.target.value })} className={field} />
          </L>
          {isAdmin ? (
            <L label="Assigned coordinator" htmlFor="f-coord">
              <select id="f-coord" value={v.assigned_coordinator_id ?? ""} onChange={(e) => set({ assigned_coordinator_id: e.target.value })} className={field}>
                <option value="">Unassigned</option>
                {coordinators.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </L>
          ) : null}
        </div>
        <L label="Summary" hint="One or two plain sentences: who it's for and what it gives." htmlFor="f-summary" error={errors.summary}>
          <textarea id="f-summary" rows={3} value={v.summary ?? ""} maxLength={600} onChange={(e) => set({ summary: e.target.value })} className={`${field} py-2`} />
        </L>
      </Fieldset>

      <Fieldset legend="Source" hint="Students see where this came from and when it was last checked.">
        <div className="grid gap-5 sm:grid-cols-2">
          <L label="Source name" hint="e.g. ched.gov.ph, or Provincial Capitol announcement" htmlFor="f-src" error={errors.source_label}>
            <input id="f-src" value={v.source_label} maxLength={160} onChange={(e) => set({ source_label: e.target.value })} className={field} />
          </L>
          <L label="Official link" hint="Optional. A full https:// address." htmlFor="f-url" error={errors.source_url}>
            <input id="f-url" type="url" value={v.source_url} maxLength={500} onChange={(e) => set({ source_url: e.target.value })} className={field} />
          </L>
        </div>
      </Fieldset>

      <Fieldset legend="Who can apply" hint="Requirements the eligibility check can test. Leave a part empty if there's no such requirement.">
        <div className="grid gap-5 sm:grid-cols-2">
          <L label="Highest GWA allowed" hint="e.g. 2.00 (1.00 is the best grade)" htmlFor="c-gwa" error={errors["criteria.gwa_max"]}>
            <input id="c-gwa" type="number" inputMode="decimal" step={0.01} min={1} max={5} value={String(v.criteria.gwa_max)} onChange={(e) => setC({ gwa_max: e.target.value })} className={field} />
          </L>
          <L label="Household income limit (₱ a year)" hint="e.g. 400000" htmlFor="c-income" error={errors["criteria.income_max"]}>
            <input id="c-income" type="number" inputMode="numeric" min={1} value={String(v.criteria.income_max)} onChange={(e) => setC({ income_max: e.target.value })} className={field} />
          </L>
        </div>
        <CheckGroup legend="Year levels" options={[1, 2, 3, 4, 5].map((y) => [String(y), `${y}${["th", "st", "nd", "rd"][y] ?? "th"} year`])} values={v.criteria.year_levels.map(String)} onChange={(vals) => setC({ year_levels: vals.map(Number) })} />
        <CheckGroup legend="Course areas (none = any course)" options={FIELDS} values={v.criteria.fields} onChange={(fields) => setC({ fields })} />
        <details className="rounded-sm border border-hairline px-4 py-2">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-ink">
            Regions {v.criteria.regions.length ? `(${v.criteria.regions.length} chosen)` : "(none = nationwide)"}
          </summary>
          <div className="pb-2">
            <CheckGroup legend="Regions" options={REGIONS} values={v.criteria.regions} onChange={(regions) => setC({ regions })} />
          </div>
        </details>
        <div className="flex flex-col gap-1">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
            <input type="checkbox" checked={v.criteria.requires_four_ps} onChange={(e) => setC({ requires_four_ps: e.target.checked })} className="size-[18px] accent-[var(--primary)]" />
            Household must be in 4Ps or the DSWD Listahanan
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
            <input type="checkbox" checked={v.criteria.requires_ofw} onChange={(e) => setC({ requires_ofw: e.target.checked })} className="size-[18px] accent-[var(--primary)]" />
            Must be the child of an active OWWA-member OFW
          </label>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Other requirements students confirm themselves</p>
          <ListEditor name="notes" items={v.notes} setItems={(notes) => set({ notes })} fields={[{ key: "text", label: "Requirement", max: 300 }]} addLabel="Add a requirement" errors={errors} />
        </div>
      </Fieldset>

      <Fieldset legend="What students get">
        <ListEditor name="benefits" items={v.benefits} setItems={(benefits) => set({ benefits })} fields={[{ key: "text", label: "Benefit", max: 300 }]} addLabel="Add a benefit" errors={errors} />
        <div className="grid gap-5 sm:grid-cols-3">
          <L label="Duration" htmlFor="f-dur" error={errors.duration}>
            <input id="f-dur" value={v.duration ?? ""} maxLength={300} onChange={(e) => set({ duration: e.target.value })} className={field} />
          </L>
          <L label="To keep it" htmlFor="f-ren" error={errors.renewal}>
            <input id="f-ren" value={v.renewal ?? ""} maxLength={600} onChange={(e) => set({ renewal: e.target.value })} className={field} />
          </L>
          <L label="Obligations" htmlFor="f-obl" error={errors.obligations}>
            <input id="f-obl" value={v.obligations ?? ""} maxLength={600} onChange={(e) => set({ obligations: e.target.value })} className={field} />
          </L>
        </div>
      </Fieldset>

      <Fieldset legend="Documents to prepare" hint="Renaming a document keeps students' ticks. Removing one clears it from their checklists.">
        <ListEditor name="documents" items={v.documents} setItems={(documents) => set({ documents })} fields={[{ key: "name", label: "Document", max: 200 }, { key: "where_to_get", label: "Where to get it", max: 300 }]} addLabel="Add a document" errors={errors} />
      </Fieldset>

      <Fieldset legend="How to apply">
        <ListEditor name="steps" items={v.steps} setItems={(steps) => set({ steps })} fields={[{ key: "title", label: "Step", max: 200 }, { key: "detail", label: "Detail", max: 600 }]} addLabel="Add a step" errors={errors} />
      </Fieldset>

      <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center justify-end gap-3 rounded-md border border-hairline bg-surface p-4 shadow-overlay nav:bottom-4">
        <span className="mr-auto text-sm text-ink-secondary">{v.id ? "Changes go live right away on published listings." : "New listings start as drafts."}</span>
        <Button type="submit" loading={pending}>{v.id ? "Save changes" : "Create draft"}</Button>
      </div>
    </form>
  );
}
