"use client";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useId, useState, type InputHTMLAttributes } from "react";

/** The input's type is left out: the component switches it to show and hide the value. */
export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  /** Accessible name of the toggle while the password is hidden. */
  showPasswordLabel?: string;
  /** Accessible name of the toggle while the password is visible. */
  hidePasswordLabel?: string;
  /**
   * Extra classes for the input, such as a margin. They are added alongside the input's own classes
   * and do not override them, so restyle it through the theme variables instead.
   */
  className?: string;
}

export function PasswordInput({
  label,
  error,
  id,
  required,
  className,
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
          {...props}
          id={inputId}
          type={visible ? "text" : "password"}
          required={required}
          aria-required={required || undefined}
          className={[
            "w-full rounded-input border px-3 py-input-y pr-10 text-sm bg-input-bg text-input-text placeholder-input-placeholder focus:outline-none focus:ring-(length:--input-focus-ring-width) focus:ring-input-focus-ring",
            error ? "border-input-border-error" : "border-input-border focus:border-input-focus-border",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
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
