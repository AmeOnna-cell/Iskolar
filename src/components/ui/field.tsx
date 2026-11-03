import type { ComponentProps, ReactNode } from "react";

export const inputClass =
  "min-h-11 w-full rounded-sm border bg-surface px-3 text-base text-ink placeholder:text-ink-hint transition-[border-color,box-shadow] duration-150 focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-wash)] focus:outline-none disabled:bg-surface-subtle disabled:text-ink-hint";

/** Label above, optional hint, the input, and an error tied to it with aria-describedby. */
export function TextField({
  label,
  name,
  hint,
  error,
  className = "",
  after,
  ...input
}: ComponentProps<"input"> & { label: string; name: string; hint?: ReactNode; error?: string; after?: ReactNode }) {
  const id = input.id ?? `f-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="-mt-1 text-caption text-ink-hint">
          {hint}
        </p>
      ) : null}
      <div className="relative">
        <input
          {...input}
          id={id}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId, input["aria-describedby"]].filter(Boolean).join(" ") || undefined}
          className={`${inputClass} ${error ? "border-danger" : "border-hairline-strong"}`}
        />
        {after}
      </div>
      {error ? (
        <p id={errorId} className="text-caption font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
