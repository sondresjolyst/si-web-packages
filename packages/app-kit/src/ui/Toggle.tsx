"use client";

import type { ButtonHTMLAttributes, MouseEvent } from "react";
import { cx } from "./cx";

type ToggleBase = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "role" | "type" | "aria-checked"> & {
  checked: boolean;
  /** Called with the new state when the switch is flipped. */
  onChange: (checked: boolean) => void;
};

/** A switch needs a name. Either a visible `label`, or an `aria-label` when there is none. */
export type ToggleProps = ToggleBase & ({ label: string } | { label?: undefined; "aria-label": string });

/** An on and off switch, for a setting that takes effect at once. */
export function Toggle({ checked, onChange, label, className, disabled, onClick, ...props }: ToggleProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) onChange(!checked);
  };

  const button = (
    <button
      {...props}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={cx(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-hidden focus-visible:ring-(length:--input-focus-ring-width) focus-visible:ring-input-focus-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-toggle-on" : "bg-toggle-off",
        label === undefined && className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "inline-block h-5 w-5 rounded-full bg-toggle-thumb shadow-sm transition-transform motion-reduce:transition-none",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );

  if (label === undefined) return button;

  // The label wraps the switch, so the text names it and a click on the text flips it.
  return (
    <label className={cx("inline-flex items-center gap-2.5 text-field-label font-medium text-field-label-text select-none", disabled ? "cursor-not-allowed" : "cursor-pointer", className)}>
      {button}
      {label}
    </label>
  );
}
