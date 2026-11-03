"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { PASSWORD_RULES } from "@/lib/auth/password";
import { TextField } from "./field";

/** Password input with show/hide. With `rules`, a live checklist of the password rules sits under it. */
export function PasswordField({
  label,
  name,
  error,
  autoComplete,
  rules = false,
}: {
  label: string;
  name: string;
  error?: string;
  autoComplete: "current-password" | "new-password";
  rules?: boolean;
}) {
  const [shown, setShown] = useState(false);
  const [value, setValue] = useState("");
  const rulesId = `f-${name}-rules`;
  return (
    <div className="flex flex-col gap-2">
      <TextField
        label={label}
        name={name}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        required
        maxLength={200}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        error={error}
        aria-describedby={rules ? rulesId : undefined}
        className="[&_input]:pr-12"
        after={
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            className="absolute top-0 right-0 grid size-11 place-items-center rounded-sm text-ink-hint hover:text-ink"
          >
            <Icon name={shown ? "eyeOff" : "eye"} size={18} />
          </button>
        }
      />
      {rules ? (
        <ul id={rulesId} className="grid gap-1 text-caption sm:grid-cols-2" aria-label="Password rules">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(value);
            return (
              <li key={rule.id} className={`flex items-center gap-2 ${ok ? "text-ok" : "text-ink-secondary"}`}>
                <Icon name={ok ? "yes" : "info"} size={14} strokeWidth={2.2} />
                <span>
                  {rule.label}
                  <span className="sr-only">{ok ? " (done)" : " (still needed)"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
