import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-hairline bg-surface py-8 text-sm text-ink-secondary">
      <div className="page-container flex flex-wrap justify-between gap-x-8 gap-y-4">
        <p className="max-w-[60ch]">
          Iskolar lists scholarships from government, private and school providers. Always confirm details with the
          official source before you apply.
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6">
          <Link className="inline-flex min-h-11 items-center text-ink-secondary hover:text-ink nav:min-h-0" href="/explore">Find scholarships</Link>
          <Link className="inline-flex min-h-11 items-center text-ink-secondary hover:text-ink nav:min-h-0" href="/check">Eligibility check</Link>
          <Link className="inline-flex min-h-11 items-center text-ink-secondary hover:text-ink nav:min-h-0" href="/help">Help and FAQ</Link>
          <Link className="inline-flex min-h-11 items-center text-ink-secondary hover:text-ink nav:min-h-0" href="/login?next=/staff">For scholarship offices</Link>
        </nav>
      </div>
    </footer>
  );
}
