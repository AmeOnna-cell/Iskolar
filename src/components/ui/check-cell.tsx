import type { ComponentProps } from "react";

/** Row-selection checkbox: 18px box inside a 44px hit area (DESIGN.md touch targets). */
export function CheckCell({ label, ...input }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className="-m-3 grid size-11 shrink-0 cursor-pointer place-items-center has-[:disabled]:cursor-not-allowed">
      <input type="checkbox" aria-label={label} {...input} className="size-[18px] accent-[var(--primary)]" />
    </label>
  );
}
