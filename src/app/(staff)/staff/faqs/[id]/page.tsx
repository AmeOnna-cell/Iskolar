import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Icon } from "@/components/icons";
import { Pill } from "@/components/scholarship/bits";
import { requireRole } from "@/lib/auth/session";
import { getFaq } from "@/lib/data/faqs";
import { getScholarshipOptions } from "@/lib/data/scholarships";
import { getStaffNames } from "@/lib/data/staff";
import { FAQ_STATUS } from "@/lib/faq";
import { ago } from "@/lib/format";
import { FaqForm } from "../faq-form";

export const metadata = { title: "Edit FAQ" };

export default async function EditFaqPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("coordinator", "admin");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [f, scholarships] = await Promise.all([getFaq(id), getScholarshipOptions()]);
  if (!f) notFound();
  const names = await getStaffNames([f.created_by, f.approved_by].filter(Boolean) as string[]);
  const isAdmin = user.role === "admin";

  return (
    <div className="page-container py-8">
      <div className="reading-column">
        <Link href={`/staff/faqs?status=${f.status}`} className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold">
          <Icon name="back" size={16} /> Back to FAQs
        </Link>
        <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">{isAdmin && f.status === "draft" ? "Review FAQ" : "Edit FAQ"}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-secondary">
          <Pill tone={FAQ_STATUS[f.status][1]}>{FAQ_STATUS[f.status][0]}</Pill>
          {f.created_by ? <span>Added by {names.get(f.created_by) ?? "staff"}</span> : null}
          {f.approved_at ? (
            <span>
              · Approved {ago(f.approved_at)}
              {f.approved_by ? ` by ${names.get(f.approved_by) ?? "an admin"}` : ""}
            </span>
          ) : null}
          {f.status === "approved" ? (
            <Link href={`/help#faq-${f.slug}`} className="inline-flex min-h-11 items-center font-semibold">
              View on the Help page
            </Link>
          ) : null}
        </div>
        <div className="mt-6 rounded-md border border-hairline bg-surface p-4 shadow-rest sm:p-6">
          <FaqForm initial={f} isAdmin={isAdmin} scholarships={scholarships} />
        </div>
      </div>
    </div>
  );
}
