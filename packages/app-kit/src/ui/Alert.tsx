import type { ReactNode } from "react";

export interface AlertProps {
  variant?: "error" | "success" | "info" | "warning";
  /**
   * Defaults to alert, which a screen reader interrupts for. Use status for text that keeps
   * changing, such as a countdown, so it is not announced on every tick.
   */
  role?: "alert" | "status";
  children: ReactNode;
}

const styles: Record<NonNullable<AlertProps["variant"]>, string> = {
  error: "bg-red-50 border-red-200 text-red-700",
  success: "bg-green-50 border-green-200 text-green-700",
  info: "bg-gray-50 border-gray-200 text-gray-700",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
};

export function Alert({ variant = "info", role = "alert", children }: AlertProps) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${styles[variant]}`} role={role}>
      {children}
    </div>
  );
}
