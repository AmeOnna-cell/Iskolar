import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { getStaffOverview } from "@/lib/data/staff";
import { plural } from "@/lib/format";

export const metadata = { title: "Scholarship office" };

export default async function StaffHomePage() {
  const user = await requireRole("coordinator", "admin");
  const o = await getStaffOverview();
  const isAdmin = user.role === "admin";

  const finding =
    o.unverified || o.open_inquiries
      ? [
          o.unverified ? `${plural(o.unverified, "listing")} ${o.unverified === 1 ? "needs" : "need"} verification` : null,
          o.open_inquiries ? `${plural(o.open_inquiries, "question")} ${o.open_inquiries === 1 ? "is" : "are"} waiting for a reply` : null,
        ]
          .filter(Boolean)
          .join(" and ") + "."
      : "Everything is verified and every question has a reply.";

  const tiles: Array<[string, string, string, string]> = [
    ["Published listings", String(o.published), `${o.open} open now`, "/staff/listings?status=published"],
    [isAdmin ? "Need verification" : "Assigned to you", String(isAdmin ? o.unverified : o.mine), isAdmin ? `${o.in_review} sent for review` : "You can edit these", isAdmin ? "/staff/listings?verification=unverified" : "/staff/listings?mine=1"],
    ["Closing in 7 days", String(o.closing_7), "Consider an announcement", "/staff/listings?status=published&sort=closes_on&dir=asc"],
    ["Questions waiting", String(o.open_inquiries), "Reply within 2 school days", "/staff/inquiries"],
  ];

  return (
    <div className="page-container py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Scholarship office</h1>
          <p className="mt-2 text-base text-ink sm:text-title-sm sm:leading-normal" data-testid="staff-finding">
            {finding}
          </p>
        </div>
        <ButtonLink href="/staff/listings/new">Add a listing</ButtonLink>
      </div>

      <ul aria-label="At a glance" className="mt-8 grid grid-cols-2 overflow-hidden rounded-md border border-hairline bg-surface shadow-rest lg:grid-cols-4">
        {tiles.map(([label, value, foot, href], i) => (
          <li key={label} className={`border-hairline ${i % 2 === 1 ? "border-l" : ""} ${i >= 2 ? "max-lg:border-t lg:border-l" : ""}`}>
            <Link href={href} className="flex h-full flex-col gap-1 px-5 py-5 text-ink no-underline hover:bg-surface-hover">
              <span className="text-sm text-ink-secondary">{label}</span>
              <span className="tnum text-headline-sm font-normal">{value}</span>
              <span className="text-caption text-ink-hint">{foot}</span>
            </Link>
          </li>
        ))}
      </ul>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["/staff/listings", "Listings", "Edit deadlines, requirements and documents. Send drafts for verification."],
          ["/staff/inquiries", "Student questions", "Reply to students. They see answers on their Help page."],
          ["/staff/announcements", "Announcements", "Post updates students see on their dashboard."],
          ...(isAdmin
            ? [
                ["/admin/users", "Users", "Change roles, deactivate or delete accounts."],
                ["/admin/audit", "Audit log", "Every staff and admin change, with before and after values."],
              ]
            : []),
        ].map(([href, title, desc]) => (
          <li key={href}>
            <Link href={href!} className="flex h-full flex-col gap-1 rounded-md border border-hairline bg-surface p-5 text-ink no-underline shadow-rest hover:border-primary">
              <span className="font-semibold">{title}</span>
              <span className="text-sm text-ink-secondary">{desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
