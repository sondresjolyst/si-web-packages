"use client";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useState, type InputHTMLAttributes } from "react";
import { FieldError, FieldLabel, inputClass, useField } from "./field";

/** The input's type is left out: the component switches it to show and hide the value. */
export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string | undefined;
  /** Accessible name of the toggle while the password is hidden. */
  showPasswordLabel?: string | undefined;
  /** Accessible name of the toggle while the password is visible. */
  hidePasswordLabel?: string | undefined;
  /**
   * Classes for placing the field, such as a margin. They go on the outer element, which holds the
   * label, the input and the error. Restyle the field through the theme variables.
   */
  className?: string;
}

export function PasswordInput({
  label,
  error,
  className,
  showPasswordLabel = "Show password",
  hidePasswordLabel = "Hide password",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const field = useField(props, error);

  return (
    <div className={className}>
      <FieldLabel htmlFor={field.inputId} required={props.required}>
        {label}
      </FieldLabel>
      <div className="relative">
        <input
          {...props}
          {...field.inputProps}
          type={visible ? "text" : "password"}
          className={inputClass(error, "pr-10")}
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
      <FieldError id={field.errorId} error={error} />
    </div>
  );
}
