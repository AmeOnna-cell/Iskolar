// ponytail: interim page body for routes whose real screen lands in Phase 4 (student) or Phase 5
// (staff/admin). Delete with the last placeholder.
export function PlaceholderPage({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="page-container py-8">
      <div className="reading-column">
        <h1 className="text-headline-sm font-bold tracking-tight text-ink sm:text-headline">{title}</h1>
        <div className="mt-4 flex flex-col gap-4 text-ink-secondary">{children}</div>
      </div>
    </div>
  );
}
