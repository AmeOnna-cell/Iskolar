import Link from "next/link";
import { Icon } from "@/components/icons";
import { requireRole } from "@/lib/auth/session";
import { listCoordinators, listProviders } from "@/lib/data/staff";
import { ListingForm } from "../listing-form";
import { EMPTY_LISTING } from "../to-form";

export const metadata = { title: "Add a listing" };

export default async function NewListingPage() {
  const user = await requireRole("coordinator", "admin");
  const [providers, coordinators] = await Promise.all([listProviders(), listCoordinators()]);
  return (
    <div className="page-container py-8">
      <div className="w-full">
        <Link href="/staff/listings" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold">
          <Icon name="back" size={16} /> Back to listings
        </Link>
        <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">Add a listing</h1>
        <p className="mt-2 mb-6 text-ink-secondary">
          It starts as a draft{user.role === "coordinator" ? ", assigned to you. Send it for verification when it's ready." : ". Verify and publish it when it's ready."}
        </p>
        <ListingForm
          initial={EMPTY_LISTING}
          providers={providers.map((p) => ({ id: p.id, label: p.name }))}
          coordinators={coordinators.map((c) => ({ id: c.id, label: c.full_name || c.email || "Unknown" }))}
          isAdmin={user.role === "admin"}
        />
      </div>
    </div>
  );
}
