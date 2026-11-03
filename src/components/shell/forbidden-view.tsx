import { ButtonLink } from "@/components/ui/button";
import { getSessionUser, homeFor } from "@/lib/auth/session";

/** The 403 page body: says what happened and offers the way back, never a redirect loop. */
export async function ForbiddenView() {
  const user = await getSessionUser();
  const home = user ? homeFor(user.role) : "/";
  const who =
    user?.role === "student"
      ? "This page is for scholarship office staff."
      : user?.role === "coordinator"
        ? "This page is for Iskolar admins."
        : "This page needs a different account.";
  return (
    <div className="page-container py-16">
      <div className="reading-column">
        <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">
          You don&apos;t have access to this page
        </h1>
        <p className="mt-4 max-w-[60ch] text-ink-secondary">
          {who} If you think you should have access, ask an Iskolar admin to check your account&apos;s role.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={home}>Go to my home page</ButtonLink>
          <ButtonLink href="/help" variant="outline">
            Help and FAQ
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
