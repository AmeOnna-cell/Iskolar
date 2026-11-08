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

// Words students actually type into the course and region search boxes (their degree, city or province).
// ponytail: hand-kept lists, not exhaustive; add words when students report a miss.
const FIELD_WORDS: Record<CourseField, string> = {
  science_math: "biology chemistry physics mathematics math statistics geology marine science",
  engineering: "civil mechanical electrical electronics chemical industrial computer engineering ece",
  it_cs: "information technology computer science it cs bsit bscs information systems",
  agriculture_fisheries: "agriculture fisheries forestry agribusiness animal science agronomy",
  health_sciences: "nursing bsn medical technology medtech pharmacy midwifery physical therapy radiologic nutrition dentistry",
  education: "bsed beed teaching teacher secondary elementary physical education",
  business_accountancy: "accountancy accounting bsa business administration management marketing finance entrepreneurship hospitality tourism",
  arts_humanities_social: "psychology political science communication journalism english history social work sociology philosophy fine arts",
};
const REGION_WORDS: Record<Region, string> = {
  ncr: "metro manila manila quezon city makati pasig taguig caloocan marikina paranaque las pinas muntinlupa pasay valenzuela",
  car: "cordillera baguio benguet ifugao abra kalinga apayao mountain province",
  ilocos: "ilocos norte ilocos sur la union pangasinan laoag vigan dagupan",
  cagayan_valley: "cagayan isabela nueva vizcaya quirino batanes tuguegarao santiago",
  central_luzon: "bulacan pampanga tarlac nueva ecija bataan zambales aurora angeles olongapo malolos",
  calabarzon: "cavite laguna batangas rizal quezon province lucena antipolo calamba",
  mimaropa: "occidental mindoro oriental mindoro marinduque romblon palawan puerto princesa calapan",
  bicol: "albay camarines norte camarines sur catanduanes masbate sorsogon legazpi naga",
  western_visayas: "iloilo aklan antique capiz guimaras boracay",
  central_visayas: "cebu bohol siquijor lapu-lapu mandaue tagbilaran",
  eastern_visayas: "leyte samar biliran tacloban ormoc catbalogan",
  zamboanga_peninsula: "zamboanga dipolog pagadian zamboanga del norte zamboanga del sur zamboanga sibugay",
  northern_mindanao: "bukidnon misamis oriental misamis occidental cagayan de oro iligan camiguin lanao del norte",
  davao: "davao city davao del norte davao del sur davao oriental davao de oro tagum",
  soccsksargen: "south cotabato cotabato sultan kudarat sarangani general santos koronadal",
  caraga: "agusan surigao dinagat butuan",
  barmm: "bangsamoro maguindanao lanao del sur basilan sulu tawi-tawi marawi cotabato city",
};
/** Course and region options with search words, for the type-to-search boxes. */
export const FIELD_OPTIONS = FIELDS.map(([v, l]) => [v, l, FIELD_WORDS[v]] as [string, string, string]);
export const REGION_OPTIONS = REGIONS.map(([v, l]) => [v, l, REGION_WORDS[v]] as [string, string, string]);

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
