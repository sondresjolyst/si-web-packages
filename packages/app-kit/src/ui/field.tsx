"use client";

import { useId, type AriaAttributes, type ReactNode } from "react";
import { cx } from "./cx";

/** The props of a field control that useField reads. An `<input>` and a `<textarea>` both have them. */
export type FieldControlProps = Pick<AriaAttributes, "aria-required" | "aria-invalid" | "aria-describedby"> & {
  id?: string | undefined;
  required?: boolean | undefined;
};

/** The ids and aria attributes a labelled input needs, from the caller's own props. */
export function useField(props: FieldControlProps, error: string | undefined) {
  // A generated id ties the label to its own control, even when two fields on a page share a name.
  const generated = useId();
  const inputId = props.id ?? generated;
  // From useId, which has no spaces. aria-describedby splits its ids on spaces.
  const errorId = `${generated}-error`;
  return {
    inputId,
    errorId,
    inputProps: {
      id: inputId,
      required: props.required,
      "aria-required": props.required ? true : props["aria-required"],
      "aria-invalid": error ? true : props["aria-invalid"],
      "aria-describedby": cx(props["aria-describedby"], error && errorId) || undefined,
    },
  };
}

/** The input's look, with the error border when there is an error. */
export function inputClass(error: string | undefined, extra?: string): string {
  return cx(
    "w-full rounded-input border px-3 py-input-y text-sm bg-input-bg text-input-text placeholder-input-placeholder focus:outline-hidden focus:ring-(length:--input-focus-ring-width) focus:ring-input-focus-ring",
    extra,
    error ? "border-input-border-error" : "border-input-border focus:border-input-focus-border",
  );
}

export function FieldLabel({ htmlFor, required, children }: { htmlFor: string; required: boolean | undefined; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-field-label font-medium text-field-label-text mb-field-label">
      {children}
      {required && <span className="text-field-required" aria-hidden="true"> *</span>}
    </label>
  );
}

export function FieldError({ id, error }: { id: string; error: string | undefined }) {
  if (!error) return null;
  return (
    <p id={id} className="mt-1 text-xs text-field-error">
      {error}
    </p>
  );
}
