"use client";

import { useEffect, useId, useRef, useState } from "react";

/** [value, label, extra words people search by (courses, cities, provinces)] */
export type ComboOption = [value: string, label: string, keywords?: string];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const LIST_MAX = 256; // max-h-64

/**
 * Type-to-search replacement for a long <select> (ARIA APG "combobox with list autocomplete").
 * The text box filters the list by label and keywords; ↓/↑ move, Enter picks, Esc closes and
 * restores, Alt+↓ opens. The value is posted through a hidden input when `name` is set, so it
 * drops into server-action and GET forms like the select it replaces. `emptyLabel` is both the
 * placeholder and the first option ("Any course"), so the choice can be cleared.
 */
export function Combobox({
  id: idProp,
  name,
  options,
  emptyLabel,
  value: controlled,
  defaultValue = "",
  onChange,
  className = "",
  disabled,
  "aria-invalid": invalid,
  "aria-describedby": describedBy,
}: {
  id?: string;
  name?: string;
  options: ComboOption[];
  emptyLabel?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const auto = useId();
  const id = idProp ?? auto;
  const [own, setOwn] = useState(defaultValue);
  const value = controlled ?? own;
  const all: ComboOption[] = emptyLabel !== undefined ? [["", emptyLabel], ...options] : options;
  const labelOf = (v: string) => (v ? (options.find(([o]) => o === v)?.[1] ?? "") : "");

  const [text, setText] = useState(labelOf(value));
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [active, setActive] = useState(-1);
  const [typed, setTyped] = useState(false); // highlight came from typing, not from the arrows or the pointer
  const [labelId, setLabelId] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  // A new value from outside (controlled, or a reset) shows its label.
  const shown = labelOf(value);
  useEffect(() => {
    if (!open) setText(shown);
  }, [shown, open]);

  // Name the listbox after the field's own <label>, not its placeholder.
  useEffect(() => {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(id)}"]`);
    if (!label) return;
    label.id ||= `${id}-label`;
    setLabelId(label.id);
  }, [id]);

  const q = filtering ? fold(text.trim()) : "";
  const matches = q ? all.filter(([v, l, k]) => v && fold(`${l} ${k ?? ""}`).includes(q)) : all;
  const noMatch = matches.length === 0;
  // Nothing matched: say so, and keep every option in reach below the message.
  const rows = noMatch ? all : matches;
  // After a miss, nothing is highlighted until the person moves to an option, so Enter can't pick by accident.
  const current = noMatch && typed ? -1 : active;

  useEffect(() => {
    if (open && current >= 0) list.current?.querySelector(`#${CSS.escape(`${id}-opt-${current}`)}`)?.scrollIntoView({ block: "nearest" });
  }, [open, current, id]);

  const show = (at?: number) => {
    const el = input.current!;
    // Phones: lift the field to the top so the list has room above the on-screen keyboard.
    if (matchMedia("(pointer: coarse)").matches) el.scrollIntoView({ block: "start", behavior: "smooth" });
    else {
      const r = el.getBoundingClientRect();
      const floor = el.closest('[role="dialog"]')?.getBoundingClientRect().bottom ?? window.innerHeight;
      setUp(floor - r.bottom < LIST_MAX && r.top > floor - r.bottom);
    }
    setOpen(true);
    setActive(at ?? Math.max(0, all.findIndex(([v]) => v === value)));
  };
  const close = () => {
    setOpen(false);
    setFiltering(false);
    setActive(-1);
  };
  const choose = (v: string) => {
    if (controlled === undefined) setOwn(v);
    setText(labelOf(v));
    close();
    if (v !== value) onChange?.(v);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const last = rows.length - 1;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") setTyped(false);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open || e.altKey) show();
      else setActive(Math.min(last, current + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) show(filtering ? last : undefined);
      else setActive(Math.max(0, current - 1));
    } else if (e.key === "Enter" && open) {
      e.preventDefault(); // pick, don't submit the form
      const opt = rows[current];
      if (opt) choose(opt[0]);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation(); // close the list, not a surrounding dialog
      setText(shown);
      close();
    }
  };

  // Leaving the box: emptied clears the choice; one match (by label or keyword) picks it; anything else is undone.
  const onBlur = () => {
    if (!open && !filtering) return;
    if (!text.trim()) return choose("");
    const exact = options.find(([, l]) => fold(l) === fold(text.trim()));
    const only = !noMatch && matches.length === 1 ? matches[0] : undefined;
    const hit = exact ?? only;
    if (hit) choose(hit[0]);
    else {
      setText(shown);
      close();
    }
  };

  const listId = `${id}-list`;
  const optId = (i: number) => `${id}-opt-${i}`;
  return (
    <div className="relative">
      <input
        ref={input}
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && current >= 0 && rows[current] ? optId(current) : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={text}
        placeholder={emptyLabel}
        onChange={(e) => {
          setText(e.target.value);
          setFiltering(true);
          setTyped(true);
          if (!open) show(0);
          setActive(e.target.value.trim() ? 0 : -1);
        }}
        onFocus={(e) => e.target.select()} // typing replaces the current choice
        onClick={() => (open ? undefined : show())}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className={`${className} scroll-mt-24 pr-10`}
      />
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-hint transition-transform ${open ? "rotate-180" : ""}`}>
        <path d="m6 9 6 6 6-6" />
      </svg>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <ul
        ref={list}
        id={listId}
        role="listbox"
        aria-labelledby={labelId}
        aria-label={labelId ? undefined : (emptyLabel ?? "Options")}
        hidden={!open}
        // z-40: above the phone tab bar (z-30), below dialogs' own stacking (the list lives inside them).
        className={`absolute right-0 left-0 z-40 max-h-64 overflow-auto rounded-sm border border-hairline-strong bg-surface py-1 shadow-overlay ${up ? "bottom-full mb-1" : "top-full mt-1"}`}
      >
        {noMatch ? (
          <li role="option" aria-disabled="true" aria-selected={false} className="flex min-h-11 items-center border-b border-hairline px-3 text-sm text-ink-secondary">
            No matches for “{text.trim()}”. Choose from the list:
          </li>
        ) : null}
        {rows.map(([v, l], i) => (
          <li
            key={v || "__empty"}
            id={optId(i)}
            role="option"
            aria-selected={v === value}
            onMouseDown={(e) => e.preventDefault()} // keep focus in the box
            onClick={() => choose(v)}
            onMouseMove={() => {
              setTyped(false);
              setActive(i);
            }}
            className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-base ${i === current ? "bg-surface-hover" : ""} ${v === value ? "font-semibold text-primary" : v ? "text-ink" : "text-ink-secondary"}`}
          >
            {l}
            {v === value ? (
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="m5 12 5 5 9-10" />
              </svg>
            ) : null}
          </li>
        ))}
      </ul>
      {/* Result count for screen readers while typing */}
      <span className="sr-only" aria-live="polite">
        {open && filtering && q ? (noMatch ? `No matches for ${text.trim()}` : `${matches.length} ${matches.length === 1 ? "match" : "matches"}`) : ""}
      </span>
    </div>
  );
}
