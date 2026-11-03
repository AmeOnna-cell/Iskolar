import { ButtonLink } from "@/components/ui/button";

export default function ScholarshipNotFound() {
  return (
    <div className="page-container py-16">
      <div className="reading-column">
        <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">This scholarship isn&apos;t listed anymore</h1>
        <p className="mt-4 max-w-[60ch] text-ink-secondary">
          It may have closed for good or been removed by the scholarship office. Other scholarships may fit you.
        </p>
        <ButtonLink href="/explore" className="mt-8">
          Browse scholarships
        </ButtonLink>
      </div>
    </div>
  );
}
