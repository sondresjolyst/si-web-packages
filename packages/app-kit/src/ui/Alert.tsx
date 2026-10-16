import type { ReactNode } from "react";
import { cx } from "./cx";

/** Props for `Alert`. */
export interface AlertProps {
  variant?: "error" | "success" | "info" | "warning";
  /**
   * The ARIA role. A screen reader interrupts for `alert`. It announces `status` without
   * interrupting, on every change of its text. Use `none` when a separate live region announces the
   * text. Defaults to `alert`.
   */
  role?: "alert" | "status" | "none";
  /**
   * The classes for placing the alert, such as a margin. Restyle it through the theme variables. A
   * class that clashes with the alert's own wins or loses by the order Tailwind emits them in.
   */
  className?: string;
  children: ReactNode;
}

const styles: Record<NonNullable<AlertProps["variant"]>, string> = {
  error: "bg-alert-error-bg border-alert-error-border text-alert-error-text",
  success: "bg-alert-success-bg border-alert-success-border text-alert-success-text",
  info: "bg-alert-info-bg border-alert-info-border text-alert-info-text",
  warning: "bg-alert-warning-bg border-alert-warning-border text-alert-warning-text",
};

/** Renders a message in an error, success, info, or warning box. */
export function Alert({ variant = "info", role = "alert", className, children }: AlertProps) {
  return (
    <div className={cx("rounded-alert border px-3 py-2 text-sm", styles[variant], className)} role={role}>
      {children}
    </div>
  );
}
