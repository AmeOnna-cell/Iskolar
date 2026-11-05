import { ButtonLink } from "@/components/ui/button";
import { getSessionUser, homeFor } from "@/lib/auth/session";

/** The 403 page body: says what happened and offers the way back, never a redirect loop. */
export async function ForbiddenView() {
  const user = await getSessionUser();
  const [why, action, href] =
    user?.role === "student"
      ? [
          "This page is for scholarship office staff. Staff accounts are set up by the Iskolar team, so student accounts can't open it.",
          "Go to my dashboard",
          homeFor("student"),
        ]
      : user?.role === "coordinator"
        ? ["This page is for Iskolar admins. If you need it for your work, ask an Iskolar admin.", "Go to the scholarship office", homeFor("coordinator")]
        : user
          ? ["This page needs a different account.", "Go to my home page", homeFor(user.role)]
          : ["Sign in with an account that can open this page.", "Sign in", "/login"];
  return (
    <div className="page-container py-16">
      <div className="reading-column">
        <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">
          You don&apos;t have access to this page
        </h1>
        <p className="mt-4 max-w-[60ch] text-ink-secondary">{why}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={href}>{action}</ButtonLink>
          <ButtonLink href="/help" variant="outline">
            Help and FAQ
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
