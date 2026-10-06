"use client";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useId, useState, type InputHTMLAttributes } from "react";
import { cx } from "./cx";

/** The input's type is left out: the component switches it to show and hide the value. */
export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  /** Accessible name of the toggle while the password is hidden. */
  showPasswordLabel?: string;
  /** Accessible name of the toggle while the password is visible. */
  hidePasswordLabel?: string;
  /**
   * Classes for placing the field, such as a margin. They go on the outer element, which holds the
   * label, the input and the error. Restyle the field through the theme variables instead.
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
  const errorId = `${inputId}-error`;

  return (
    <div className={className}>
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
          aria-required={required ? true : props["aria-required"]}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={cx(props["aria-describedby"], error && errorId) || undefined}
          className={cx(
            "w-full rounded-input border px-3 py-input-y pr-10 text-sm bg-input-bg text-input-text placeholder-input-placeholder focus:outline-hidden focus:ring-(length:--input-focus-ring-width) focus:ring-input-focus-ring",
            error ? "border-input-border-error" : "border-input-border focus:border-input-focus-border",
          )}
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
      {error && (
        <p id={errorId} className="mt-1 text-xs text-field-error">
          {error}
        </p>
      )}
    </div>
  );
}
