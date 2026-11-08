import Link from "next/link";

const LINKS: Array<[href: string, label: string]> = [
  ["/explore", "Find scholarships"],
  ["/check", "Eligibility check"],
  ["/help", "Help and FAQ"],
  ["/privacy", "Privacy"],
  ["/login?next=/staff", "For scholarship offices"],
];

// Phones: one short line and a two-column link grid (44px rows, no extra gaps). Wider: the full sentence beside an inline row.
export function Footer() {
  return (
    <footer className="mt-10 border-t border-hairline bg-surface py-4 text-sm text-ink-secondary sm:mt-16 sm:py-8">
      <div className="page-container flex flex-wrap justify-between gap-x-8 gap-y-2 sm:gap-y-4">
        <p className="max-w-[60ch]">
          <span className="max-sm:hidden">Iskolar lists scholarships from government, private and school providers. Always confirm</span>
          <span className="sm:hidden">Confirm</span> details with the official source before you apply.
        </p>
        <nav aria-label="Footer" className="grid w-full grid-cols-2 gap-x-4 sm:flex sm:w-auto sm:flex-wrap sm:gap-x-6">
          {LINKS.map(([href, label]) => (
            <Link key={href} className="inline-flex min-h-11 items-center text-ink-secondary hover:text-ink nav:min-h-0" href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
