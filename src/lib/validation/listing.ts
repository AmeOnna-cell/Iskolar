import { z } from "zod";
import { FIELDS, PROVIDER_TYPES, REGIONS, SUBMISSION_METHODS } from "@/lib/reference";

const date = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a full date.")]);
const opt = (max: number, label: string) => z.string().trim().max(max, `${label}: use ${max} characters or fewer.`);
const id = z.union([z.literal(""), z.uuid()]).optional();

export const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export const listingSchema = z
  .object({
    id,
    name: z.string().trim().min(3, "Name: at least 3 characters.").max(160, "Name: 160 characters or fewer."),
    slug: z.string().trim().max(80).optional(),
    provider_id: id,
    new_provider: z
      .object({
        name: z.string().trim().min(2, "Provider name: at least 2 characters.").max(160),
        short_name: opt(120, "Short name").optional(),
        abbr: z.string().trim().min(1, "Abbreviation: 1 to 5 letters.").max(5, "Abbreviation: 1 to 5 letters."),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Colour: a hex value like #1D3E8A."),
        type: z.enum(PROVIDER_TYPES.map(([v]) => v) as [string, ...string[]]),
        website: z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Website: a full http(s) address." })]).optional(),
      })
      .optional(),
    amount_text: z.string().trim().min(1, "Amount: describe it, e.g. ₱15,000 a year.").max(120),
    amount_num: z.union([z.literal(""), z.coerce.number().int().min(0, "Yearly value: 0 or more.").max(10_000_000)]).optional(),
    opens_on: date,
    closes_on: date,
    location_label: opt(120, "Location"),
    source_label: z.string().trim().min(2, "Source: name where this came from.").max(160),
    source_url: z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Source link: a full http(s) address." })]),
    summary: opt(600, "Summary"),
    duration: opt(300, "Duration"),
    renewal: opt(600, "Renewal"),
    obligations: opt(600, "Obligations"),
    assigned_coordinator_id: id,
    submission_method: z.union([z.literal(""), z.enum(SUBMISSION_METHODS.map(([v]) => v) as [string, ...string[]])]),
    submission_place: opt(160, "Office or place"),
    submission_address: opt(300, "Address"),
    submission_hours: opt(160, "Office hours"),
    submission_url: z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Online link: a full http(s) address." })]),
    submission_note: opt(600, "Note"),
    criteria: z.object({
      income_max: z.union([z.literal(""), z.coerce.number().int().positive("Income limit: more than 0.")]),
      gwa_max: z.union([z.literal(""), z.coerce.number().min(1, "GWA: between 1.00 and 5.00.").max(5, "GWA: between 1.00 and 5.00.")]),
      year_levels: z.array(z.coerce.number().int().min(1).max(6)).max(6),
      fields: z.array(z.enum(FIELDS.map(([v]) => v) as [string, ...string[]])),
      regions: z.array(z.enum(REGIONS.map(([v]) => v) as [string, ...string[]])),
      requires_ofw: z.boolean(),
      requires_four_ps: z.boolean(),
    }),
    benefits: z.array(z.object({ id, text: z.string().trim().min(1, "Benefit: can't be empty.").max(300) })).max(20),
    documents: z
      .array(z.object({ id, name: z.string().trim().min(1, "Document name: can't be empty.").max(200), where_to_get: opt(300, "Where to get it") }))
      .max(30),
    steps: z.array(z.object({ id, title: z.string().trim().min(1, "Step: can't be empty.").max(200), detail: opt(600, "Step detail") })).max(20),
    notes: z.array(z.object({ id, text: z.string().trim().min(1, "Requirement: can't be empty.").max(300) })).max(20),
  })
  .refine((v) => !v.opens_on || !v.closes_on || v.closes_on >= v.opens_on, {
    path: ["closes_on"],
    message: "The deadline must be on or after the opening date.",
  })
  .refine((v) => v.provider_id || v.new_provider, { path: ["provider_id"], message: "Choose a provider, or add a new one." })
  .refine((v) => v.submission_method !== "online" || v.submission_url, {
    path: ["submission_url"],
    message: "Online link: add where students submit online.",
  });

export type ListingInput = z.input<typeof listingSchema>;
