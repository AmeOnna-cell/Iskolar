import Link from "next/link";

const LINKS: Array<[href: string, label: string]> = [
  ["/explore", "Find scholarships"],
  ["/check", "Eligibility check"],
  ["/help", "Help and FAQ"],
  ["/privacy", "Privacy"],
  ["/login?next=/staff", "For scholarship offices"],
];

/** Eligibility check is for students only; visitors and staff don't get the link. */
export function Footer({ student = false }: { student?: boolean }) {
  return (
    <footer className="mt-10 border-t border-hairline bg-surface py-2 text-sm text-ink-secondary sm:mt-12 sm:py-4">
      <div className="page-container">
        <nav aria-label="Footer" className="grid w-full grid-cols-2 gap-x-4 sm:flex sm:w-auto sm:flex-wrap sm:gap-x-6">
          {LINKS.filter(([href]) => student || href !== "/check").map(([href, label]) => (
            <Link key={href} className="inline-flex min-h-11 items-center text-ink-secondary hover:text-ink nav:min-h-0" href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
