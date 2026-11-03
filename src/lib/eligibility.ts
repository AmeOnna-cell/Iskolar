// Turns the database's explainable eligibility items (public.eligibility_items) into the
// prototype's wording. The SQL decides met / not met / unknown; this file only writes the words.
import { fieldLabel, incomeLabel, regionLabel, STEM, type CourseField, type IncomeBracket, type Region } from "./reference";
import { ord, peso } from "./format";

export type ItemStatus = "met" | "not_met" | "unknown";
export type Verdict = "yes" | "maybe" | "no" | "none";

export type EligibilityItem =
  | { kind: "field"; status: ItemStatus; required: CourseField[]; have: CourseField | null }
  | { kind: "year"; status: ItemStatus; required: number[]; have: number | null }
  | { kind: "gwa"; status: ItemStatus; required: number; have: number | null }
  | { kind: "income"; status: ItemStatus; required: number; have: IncomeBracket | null; answered?: boolean }
  | { kind: "four_ps"; status: ItemStatus; required: true; have: "yes" | "no" | "unsure" | null }
  | { kind: "ofw"; status: ItemStatus; required: true; have: boolean | null }
  | { kind: "region"; status: ItemStatus; required: Region[]; have: Region | null };

export type Evaluation = {
  verdict: Verdict;
  met: number;
  unknown: number;
  not_met: number;
  total: number;
  items: EligibilityItem[];
};

const NOANS = "You haven’t answered this yet";
const lc = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0]!.toLowerCase() + s.slice(1) : s);
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** The requirement, as a student reads it: "GWA of 2.00 or better". */
export function requirementLabel(item: EligibilityItem): string {
  switch (item.kind) {
    case "field":
      return sameSet(item.required, STEM)
        ? "Taking a science, math, engineering, IT or agriculture course"
        : `Taking a course in ${item.required.map((f) => fieldLabel[f]).join(" or ")}`;
    case "year":
      return `${item.required.map(ord).join(" or ")} year student`;
    case "gwa":
      return `GWA of ${Number(item.required).toFixed(2)} or better`;
    case "income":
      return `Household income of ${peso(item.required)} a year or less`;
    case "four_ps":
      return "Household is in 4Ps or the DSWD Listahanan";
    case "ofw":
      return "Child of an active OWWA-member OFW";
    case "region":
      return `Lives in ${item.required.map((r) => regionLabel[r]).join(" or ")}`;
  }
}

/** What the student told us, explaining the status: "Your GWA is 1.85". */
export function haveText(item: EligibilityItem): string {
  switch (item.kind) {
    case "field":
      return item.have ? `Your course area is ${fieldLabel[item.have]}` : NOANS;
    case "year":
      return item.have ? `You’re in ${ord(item.have)} year` : NOANS;
    case "gwa":
      return item.have != null ? `Your GWA is ${Number(item.have).toFixed(2)}` : NOANS;
    case "income":
      if (!item.have) return item.answered ? "You weren’t sure of your household income" : NOANS;
      return item.status === "unknown"
        ? `You said ${lc(incomeLabel[item.have])}, which may be under or over this limit`
        : `You said ${lc(incomeLabel[item.have])}`;
    case "four_ps":
      if (item.have === "unsure") return "You weren’t sure. Ask your barangay or DSWD office.";
      if (item.have === "yes") return "You said your household is listed";
      if (item.have === "no") return "You said your household isn’t listed";
      return NOANS;
    case "ofw":
      if (item.have === true) return "You said a parent is an OFW";
      if (item.have === false) return "You said neither parent is an OFW";
      return NOANS;
    case "region":
      return item.have ? `You live in ${regionLabel[item.have]}` : NOANS;
  }
}

/** Which wizard step asks this question ("Answer now" links). */
export function stepFor(item: EligibilityItem): 1 | 2 | 3 | 4 {
  if (item.kind === "field" || item.kind === "year") return 1;
  if (item.kind === "gwa") return 2;
  if (item.kind === "region") return 4;
  return 3;
}

export const VERDICT_LABEL: Record<Exclude<Verdict, "none">, string> = {
  yes: "You qualify",
  maybe: "Might qualify",
  no: "Not eligible right now",
};

/** The verdict banner sentence (prototype). */
export function verdictSentence(e: Pick<Evaluation, "verdict" | "met" | "unknown" | "not_met" | "total">): string {
  if (e.verdict === "yes") {
    return e.total === 0 ? "There are no requirements we can check for this one" : `You meet all ${e.total === 1 ? "1 requirement" : `${e.total} requirements`} we can check`;
  }
  if (e.verdict === "maybe") {
    return `You meet ${e.met} of ${e.total}. ${e.unknown === 1 ? "One answer is" : `${e.unknown} answers are`} missing.`;
  }
  if (e.verdict === "no") return `You don’t meet ${e.not_met === 1 ? "1 requirement" : `${e.not_met} requirements`}`;
  return "Answer a few questions to see which requirements you meet.";
}

/** The one-line reason under a card on the results page ("Requires …", "Missing answer: …"). */
export function reasonLine(gap: EligibilityItem | null | undefined): string | null {
  if (!gap) return null;
  if (gap.status === "not_met") return `Requires ${lc(requirementLabel(gap))}. ${haveText(gap)}.`;
  if (gap.status === "unknown") return `Missing answer: ${lc(requirementLabel(gap))}.`;
  return null;
}

type Criteria = {
  fields: CourseField[] | null;
  year_levels: number[] | null;
  gwa_max: number | null;
  income_max: number | null;
  requires_four_ps: boolean;
  requires_ofw: boolean;
  regions: Region[] | null;
} | null;

/**
 * The requirements as a list, for people without answers (visitors, staff, students who haven't
 * done the check): same order and wording as the evaluated list, every status "unknown".
 */
export function criteriaItems(c: Criteria): EligibilityItem[] {
  if (!c) return [];
  const out: EligibilityItem[] = [];
  if (c.fields?.length) out.push({ kind: "field", status: "unknown", required: c.fields, have: null });
  if (c.year_levels?.length) out.push({ kind: "year", status: "unknown", required: c.year_levels, have: null });
  if (c.gwa_max != null) out.push({ kind: "gwa", status: "unknown", required: Number(c.gwa_max), have: null });
  if (c.income_max != null) out.push({ kind: "income", status: "unknown", required: c.income_max, have: null });
  if (c.requires_four_ps) out.push({ kind: "four_ps", status: "unknown", required: true, have: null });
  if (c.requires_ofw) out.push({ kind: "ofw", status: "unknown", required: true, have: null });
  if (c.regions?.length) out.push({ kind: "region", status: "unknown", required: c.regions, have: null });
  return out;
}

export const DISCLAIMER = "This is a preliminary check based on your answers, not an official decision.";
