import Link from "next/link";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Pagination } from "@/components/ui/table-bits";
import { requireRole } from "@/lib/auth/session";
import { faqCounts, listFaqs } from "@/lib/data/faqs";
import { getStaffNames } from "@/lib/data/staff";
import { FAQ_STATUS, type FaqStatus } from "@/lib/faq";
import { ago } from "@/lib/format";
import { one, parsePaging, withParams } from "@/lib/paging";

export const metadata = { title: "FAQs" };

type SP = Record<string, string | string[] | undefined>;
const TABS: Array<[FaqStatus, string]> = [
  ["draft", "Drafts"],
  ["approved", "Approved"],
  ["archived", "Archived"],
];
const SAVED: Record<string, string> = {
  saved: "Draft saved. An admin approves it before students see it.",
  approved: "FAQ approved. Students see it on the Help page and in suggestions.",
  archived: "FAQ archived. Students no longer see it.",
};

export default async function FaqsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireRole("coordinator", "admin");
  const sp = await searchParams;
  const status = TABS.find(([s]) => s === one(sp.status))?.[0] ?? "draft";
  const q = (one(sp.q) ?? "").trim().slice(0, 100);
  const { page, pageSize } = parsePaging(sp, { size: 10 });
  const [{ rows, total }, counts] = await Promise.all([listFaqs({ q, status, page, pageSize }), faqCounts()]);
  const names = await getStaffNames([...new Set(rows.map((r) => r.created_by).filter(Boolean) as string[])]);
  const saved = SAVED[one(sp.saved) ?? ""];
  const isAdmin = user.role === "admin";
  const pathname = "/staff/faqs";
  const empty = q
    ? `No ${FAQ_STATUS[status][0].toLowerCase()} FAQs match “${q}”.`
    : status === "draft"
      ? isAdmin
        ? "No drafts waiting for approval."
        : "No drafts. Add an FAQ, or use “Save as FAQ” on an answered question."
      : "Nothing here yet.";

  return (
    <div className="page-container py-8">
      <div className="w-full">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">FAQs</h1>
            <p className="mt-2 text-ink-secondary">
              {isAdmin
                ? "Approved FAQs show on the Help page and as suggestions while students type a question."
                : "Draft answers to common questions. An admin approves them before students see them."}
            </p>
          </div>
          <ButtonLink href="/staff/faqs/new">Add an FAQ</ButtonLink>
        </div>

        {saved ? (
          <div className="mt-6">
            <Notice tone="ok">{saved}</Notice>
          </div>
        ) : null}

        <nav aria-label="FAQ status" className="mt-6 flex gap-1 overflow-x-auto border-b border-hairline">
          {TABS.map(([key, label]) => (
            <Link
              key={key}
              href={withParams(pathname, { q }, { status: key })}
              aria-current={key === status ? "page" : undefined}
              className={`-mb-px flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold whitespace-nowrap no-underline ${key === status ? "border-primary text-primary" : "border-transparent text-ink-secondary hover:text-ink"}`}
            >
              {label}
              <span className="tnum rounded-full border border-hairline bg-surface-subtle px-2 text-tab text-ink-secondary">{counts[key]}</span>
            </Link>
          ))}
        </nav>

        <form action={pathname} role="search" className="mt-4 mb-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="status" value={status} />
          <input type="hidden" name="size" value={pageSize} />
          <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-sm font-semibold text-ink">
            Search FAQs
            <input name="q" type="search" defaultValue={q} maxLength={100} placeholder="Words in the question or answer" className={`${inputClass} border-hairline-strong`} />
          </label>
          <button type="submit" className={buttonClass("outline")}>
            Search
          </button>
          {q ? (
            <Link href={withParams(pathname, {}, { status })} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold">
              Clear
            </Link>
          ) : null}
        </form>

        <div className="overflow-hidden rounded-md border border-hairline bg-surface shadow-rest">
          {rows.length === 0 ? (
            <p className="px-6 py-10 text-center text-ink-secondary">{empty}</p>
          ) : (
            <ul>
              {rows.map((f) => (
                <li key={f.id} className="flex items-start gap-3 border-t border-hairline px-4 py-4 first:border-t-0 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{f.question}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-secondary">{f.answer.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-hint">
                      <span>{f.scholarship?.name ?? "General"}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {f.created_by ? `By ${names.get(f.created_by) ?? "staff"}, ` : ""}updated {ago(f.updated_at)}
                      </span>
                    </p>
                  </div>
                  <Link href={`/staff/faqs/${f.id}`} className="inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-semibold">
                    {isAdmin && f.status === "draft" ? "Review" : isAdmin || f.status === "draft" ? "Edit" : "View"}
                    <span className="sr-only"> {f.question}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Pagination pathname={pathname} sp={sp} page={page} pageSize={pageSize} total={total} />
        </div>
      </div>
    </div>
  );
}
