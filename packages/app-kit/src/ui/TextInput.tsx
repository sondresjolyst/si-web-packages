"use client";

import type { InputHTMLAttributes } from "react";
import { FieldError, FieldLabel, inputClass, useField } from "./field";

/** Props for `TextInput`. */
export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
  /**
   * The classes for placing the field, such as a margin. They go on the outer element, which holds
   * the label, the input, and the error. Restyle the field through the theme variables.
   */
  className?: string | undefined;
}

/** Renders a labeled text input with an optional error message. */
export function TextInput({ label, error, className, ...props }: TextInputProps) {
  const field = useField(props, error);

  return (
    <div className={className}>
      <FieldLabel htmlFor={field.inputId} required={props.required}>
        {label}
      </FieldLabel>
      <input {...props} {...field.inputProps} className={inputClass(error)} />
      <FieldError id={field.errorId} error={error} />
    </div>
  );
}
