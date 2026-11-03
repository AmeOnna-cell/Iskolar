// Labels for the database enums (supabase/migrations/…_enums_profiles.sql). Prototype wording.
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
export type CourseField = Enums["course_field"];
export type Region = Enums["region"];
export type IncomeBracket = Enums["income_bracket"];
export type ProviderType = Enums["provider_type"];

export const FIELDS: Array<[CourseField, string]> = [
  ["science_math", "Science & Math"],
  ["engineering", "Engineering"],
  ["it_cs", "IT & Computer Science"],
  ["agriculture_fisheries", "Agriculture & Fisheries"],
  ["health_sciences", "Health Sciences"],
  ["education", "Education"],
  ["business_accountancy", "Business & Accountancy"],
  ["arts_humanities_social", "Arts, Humanities & Social Sciences"],
];
export const STEM: CourseField[] = ["science_math", "engineering", "it_cs", "agriculture_fisheries"];

export const REGIONS: Array<[Region, string]> = [
  ["ncr", "NCR"],
  ["car", "CAR"],
  ["ilocos", "Region I – Ilocos"],
  ["cagayan_valley", "Region II – Cagayan Valley"],
  ["central_luzon", "Region III – Central Luzon"],
  ["calabarzon", "Region IV-A – CALABARZON"],
  ["mimaropa", "MIMAROPA"],
  ["bicol", "Region V – Bicol"],
  ["western_visayas", "Region VI – Western Visayas"],
  ["central_visayas", "Region VII – Central Visayas"],
  ["eastern_visayas", "Region VIII – Eastern Visayas"],
  ["zamboanga_peninsula", "Region IX – Zamboanga Peninsula"],
  ["northern_mindanao", "Region X – Northern Mindanao"],
  ["davao", "Region XI – Davao"],
  ["soccsksargen", "Region XII – SOCCSKSARGEN"],
  ["caraga", "Caraga"],
  ["barmm", "BARMM"],
];

export const INCOME: Array<[IncomeBracket, string]> = [
  ["below_150k", "Below ₱150,000"],
  ["150k_250k", "₱150,000 to ₱250,000"],
  ["250k_400k", "₱250,001 to ₱400,000"],
  ["400k_800k", "₱400,001 to ₱800,000"],
  ["above_800k", "More than ₱800,000"],
];

export const PROVIDER_TYPES: Array<[ProviderType, string, string]> = [
  ["government", "Government", "National agencies like CHED, DOST and OWWA"],
  ["local_government", "Local government", "City and provincial programs"],
  ["private", "Private", "Foundations and companies"],
  ["school", "School", "Awards from universities and colleges"],
];

const lookup = <K extends string>(list: Array<[K, string, ...string[]]>) =>
  Object.fromEntries(list.map(([k, v]) => [k, v])) as Record<K, string>;

export const fieldLabel = lookup(FIELDS);
export const regionLabel = lookup(REGIONS);
export const incomeLabel = lookup(INCOME);
export const providerTypeLabel = lookup(PROVIDER_TYPES);

export const isField = (v: unknown): v is CourseField => FIELDS.some(([k]) => k === v);
export const isRegion = (v: unknown): v is Region => REGIONS.some(([k]) => k === v);
export const isProviderType = (v: unknown): v is ProviderType => PROVIDER_TYPES.some(([k]) => k === v);
export const isIncome = (v: unknown): v is IncomeBracket => INCOME.some(([k]) => k === v);
