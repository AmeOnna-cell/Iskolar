import Link from "next/link";

export function HelpTabs({ current }: { current: "faq" | "questions" }) {
  return (
    <nav aria-label="Help sections" className="mt-3 flex gap-5 border-b border-hairline text-caption">
      {([
        { key: "faq", label: "Help and FAQ", href: "/help" },
        { key: "questions", label: "Questions", href: "/help/questions" },
      ] as const).map(({ key, label, href }) => (
        <Link key={key} href={href} aria-current={key === current ? "page" : undefined} className={`inline-flex min-h-11 items-center border-b-2 font-semibold no-underline ${key === current ? "border-primary text-primary" : "border-transparent text-ink-secondary hover:text-ink"}`}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
