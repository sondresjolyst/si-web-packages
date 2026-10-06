"use client";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useId, useState, type InputHTMLAttributes } from "react";

export interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Accessible name of the toggle while the password is hidden. */
  showPasswordLabel?: string;
  /** Accessible name of the toggle while the password is visible. */
  hidePasswordLabel?: string;
}

export function PasswordInput({
  label,
  error,
  id,
  required,
  showPasswordLabel = "Show password",
  hidePasswordLabel = "Hide password",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  // Fall back to a generated id so the label is always tied to its control. Without it, a call
  // site that passes neither id nor name renders a label pointing at nothing, which leaves
  // screen reader users with an unidentified field.
  const generated = useId();
  const inputId = id ?? props.name ?? generated;

  return (
    <div>
      <label htmlFor={inputId} className="block text-field-label font-medium text-field-label-text mb-field-label">
        {label}
        {required && <span className="text-field-required"> *</span>}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          required={required}
          aria-required={required || undefined}
          className={`w-full rounded-input border px-3 py-input-y pr-10 text-sm bg-input-bg text-input-text placeholder-input-placeholder focus:outline-none focus:ring-(length:--input-focus-ring-width) focus:ring-input-focus-ring ${
            error ? "border-input-border-error" : "border-input-border focus:border-input-focus-border"
          }`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 px-3 text-input-toggle hover:text-input-toggle-hover"
          aria-label={visible ? hidePasswordLabel : showPasswordLabel}
        >
          {visible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-field-error">{error}</p>}
    </div>
  );
}
