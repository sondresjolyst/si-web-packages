import type { ReactNode } from "react";
import { cx } from "./cx";

export interface AlertProps {
  variant?: "error" | "success" | "info" | "warning";
  /**
   * Defaults to alert, which a screen reader interrupts for. Use status for text that keeps
   * changing, such as a countdown, so it is not announced on every tick.
   */
  role?: "alert" | "status";
  /**
   * Classes for placing the alert, such as a margin. Restyle it through the theme variables
   * instead: whether a class that clashes with the alert's own wins depends on the order Tailwind
   * emits them in.
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

export function Alert({ variant = "info", role = "alert", className, children }: AlertProps) {
  return (
    <div className={cx("rounded-alert border px-3 py-2 text-sm", styles[variant], className)} role={role}>
      {children}
    </div>
  );
}
