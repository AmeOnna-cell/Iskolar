"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function PageSizeSelect({ sizes, value }: { sizes: number[]; value: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex items-center gap-2">
      Rows
      <select
        value={value}
        onChange={(e) => {
          const u = new URLSearchParams(params.toString());
          u.set("size", e.target.value);
          u.delete("page");
          router.replace(`${pathname}?${u.toString()}`, { scroll: false });
        }}
        className="h-11 rounded-sm border border-hairline-strong bg-surface px-2 text-sm text-ink nav:h-9"
      >
        {sizes.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}
