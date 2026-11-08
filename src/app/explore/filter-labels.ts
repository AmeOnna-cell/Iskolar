import type { SearchParams } from "@/lib/data/scholarships";
import { fieldLabel, providerTypeLabel, regionLabel } from "@/lib/reference";

const STATUS = { open: "Open now", upcoming: "Opening soon", closed: "Closed" } as const;

/** The applied filters by name, for the row under the search box and the empty state. */
export function activeFilters(p: SearchParams): Array<[key: keyof SearchParams, label: string]> {
  const out: Array<[keyof SearchParams, string]> = [];
  if (p.mine) out.push(["mine", "Only ones I qualify for"]);
  if (p.status) out.push(["status", STATUS[p.status]]);
  if (p.type) out.push(["type", providerTypeLabel[p.type]]);
  if (p.field) out.push(["field", fieldLabel[p.field]]);
  if (p.region) out.push(["region", regionLabel[p.region]]);
  if (p.year) out.push(["year", `${p.year}${["th", "st", "nd", "rd"][p.year] ?? "th"} year`]);
  return out;
}
