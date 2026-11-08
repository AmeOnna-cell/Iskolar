import type { EditableListing } from "@/lib/data/staff";
import type { FormInitial } from "./listing-form";

let n = 0;
const key = () => `s${++n}`;

export const EMPTY_LISTING: FormInitial = {
  id: "",
  name: "",
  slug: "",
  provider_id: "",
  amount_text: "",
  amount_num: "",
  opens_on: "",
  closes_on: "",
  location_label: "",
  source_label: "",
  source_url: "",
  summary: "",
  duration: "",
  renewal: "",
  obligations: "",
  assigned_coordinator_id: "",
  criteria: { income_max: "", gwa_max: "", year_levels: [], fields: [], regions: [], requires_ofw: false, requires_four_ps: false },
  benefits: [],
  documents: [],
  steps: [],
  notes: [],
};

export function toFormInitial(s: EditableListing): FormInitial {
  const c = s.criteria;
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    provider_id: s.provider_id,
    amount_text: s.amount_text,
    amount_num: s.amount_num == null ? "" : String(s.amount_num),
    opens_on: s.opens_on ?? "",
    closes_on: s.closes_on ?? "",
    location_label: s.location_label ?? "",
    source_label: s.source_label,
    source_url: s.source_url ?? "",
    summary: s.summary ?? "",
    duration: s.duration ?? "",
    renewal: s.renewal ?? "",
    obligations: s.obligations ?? "",
    assigned_coordinator_id: s.assigned_coordinator_id ?? "",
    criteria: {
      income_max: c?.income_max == null ? "" : String(c.income_max),
      gwa_max: c?.gwa_max == null ? "" : Number(c.gwa_max).toFixed(2),
      year_levels: c?.year_levels ?? [],
      fields: c?.fields ?? [],
      regions: c?.regions ?? [],
      requires_ofw: c?.requires_ofw ?? false,
      requires_four_ps: c?.requires_four_ps ?? false,
    },
    benefits: s.benefits.map((b) => ({ key: key(), id: b.id, text: b.text })),
    documents: s.documents.map((d) => ({ key: key(), id: d.id, name: d.name, where_to_get: d.where_to_get })),
    steps: s.steps.map((st) => ({ key: key(), id: st.id, title: st.title, detail: st.detail })),
    notes: s.notes.map((x) => ({ key: key(), id: x.id, text: x.text })),
  };
}
