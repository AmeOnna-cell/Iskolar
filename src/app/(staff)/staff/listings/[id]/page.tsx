import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Icon } from "@/components/icons";
import { Pill, SamplePill } from "@/components/scholarship/bits";
import { Notice } from "@/components/ui/notice";
import { requireRole } from "@/lib/auth/session";
import { getDeadlineHistory, getListingForEdit, getStaffNames, listCoordinators, listProviders } from "@/lib/data/staff";
import { ago, formatDate } from "@/lib/format";
import { ListingForm } from "../listing-form";
import { toFormInitial } from "../to-form";
import { UnsavedProvider } from "../unsaved";
import { StatusPanel } from "./status-panel";

export const metadata = { title: "Edit listing" };

const STATUS_LABEL = { draft: "Draft", in_review: "Sent for review", published: "Published", archived: "Archived" } as const;

export default async function EditListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const user = await requireRole("coordinator", "admin");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { saved } = await searchParams;
  const s = await getListingForEdit(id);
  if (!s) notFound();
  const isAdmin = user.role === "admin";
  const canEdit = isAdmin || s.assigned_coordinator_id === user.id;
  const [providers, coordinators, history] = await Promise.all([listProviders(), listCoordinators(), getDeadlineHistory(id)]);
  const names = await getStaffNames([...new Set([s.assigned_coordinator_id, ...history.map((h) => h.changed_by)].filter(Boolean) as string[])]);

  return (
    <div className="page-container py-8">
      <div className="mx-auto w-full max-w-[840px]">
        <Link href="/staff/listings" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold">
          <Icon name="back" size={16} /> Back to listings
        </Link>
        <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">{s.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-secondary">
          <Pill tone={s.listing_status === "published" ? "ok" : s.listing_status === "in_review" ? "info" : "neutral"}>{STATUS_LABEL[s.listing_status]}</Pill>
          {s.is_sample ? (
            <SamplePill />
          ) : s.verification === "verified" ? (
            <Pill icon="shield">Verified {s.last_verified_at ? formatDate(s.last_verified_at.slice(0, 10), true) : ""}</Pill>
          ) : (
            <Pill tone="warn" icon="warn">Unverified</Pill>
          )}
          <span>Coordinator: {s.assigned_coordinator_id ? names.get(s.assigned_coordinator_id) : "Unassigned"}</span>
          {s.listing_status === "published" ? (
            <Link href={`/s/${s.slug}`} className="inline-flex min-h-11 items-center font-semibold">
              View as a student
            </Link>
          ) : null}
        </div>

        {saved ? (
          <div className="mt-6">
            <Notice tone="ok">Saved. {s.listing_status === "published" ? "Students see the changes now." : "It isn't public until it's published."}</Notice>
          </div>
        ) : null}

        <UnsavedProvider>
          {canEdit || history.length ? (
            <section aria-labelledby="workflow-h" className="mt-6 rounded-md border border-hairline bg-surface p-5 shadow-rest sm:p-6">
              <h2 id="workflow-h" className="mb-3 text-title-sm font-[650] text-ink">Status</h2>
              {canEdit ? <StatusPanel id={s.id} status={s.listing_status} verified={s.verification === "verified"} isAdmin={isAdmin} /> : null}
              {canEdit && !isAdmin ? (
                <p className="mt-3 text-sm text-ink-secondary">An admin verifies and publishes listings. You can edit listings assigned to you, including published ones.</p>
              ) : null}
              {history.length ? (
                <div className={canEdit ? "mt-5 border-t border-hairline pt-4" : ""}>
                  <h3 className="mb-2 text-sm font-semibold text-ink">Deadline changes</h3>
                  <ul className="flex flex-col gap-1 text-sm text-ink-secondary">
                    {history.map((h) => (
                      <li key={h.id}>
                        {h.old_closes_on ? formatDate(h.old_closes_on, true) : "None"} → {h.new_closes_on ? formatDate(h.new_closes_on, true) : "None"}, by{" "}
                        {h.changed_by ? names.get(h.changed_by) ?? "staff" : "the system"}, {ago(h.changed_at)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          <div className="mt-6">
            {canEdit ? (
              <ListingForm
                key={s.updated_at}
                initial={toFormInitial(s)}
                providers={providers.map((p) => ({ id: p.id, label: p.name }))}
                coordinators={coordinators.map((c) => ({ id: c.id, label: c.full_name || c.email || "Unknown" }))}
                isAdmin={isAdmin}
              />
            ) : (
              <Notice>
                You can&apos;t edit this listing: it&apos;s assigned to {s.assigned_coordinator_id ? names.get(s.assigned_coordinator_id) : "no one"}. Ask an admin to assign it to you.
              </Notice>
            )}
          </div>
        </UnsavedProvider>
      </div>
    </div>
  );
}
