import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "outline" | "text" | "danger";
type Size = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm border font-semibold no-underline transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";
const variants: Record<Variant, string> = {
  primary: "border-transparent bg-primary text-on-primary hover:bg-primary-hover",
  outline: "border-hairline-strong bg-surface text-ink hover:bg-surface-hover",
  text: "border-transparent bg-transparent px-1 text-primary hover:underline",
  danger: "border-transparent bg-danger text-white hover:opacity-90",
};
const sizes: Record<Size, string> = {
  md: "min-h-11 px-4 text-sm",
  // 36px only where a mouse is likely (≥900px); 44px touch targets below that (DESIGN.md).
  sm: "min-h-11 px-3 text-sm nav:min-h-9",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${variant === "text" ? "" : sizes[size]} ${extra}`.trim();
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  block = false,
  className = "",
  children,
  disabled,
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean; block?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, `${block ? "w-full" : ""} ${className}`)}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link {...rest} className={buttonClass(variant, size, className)} />;
}
