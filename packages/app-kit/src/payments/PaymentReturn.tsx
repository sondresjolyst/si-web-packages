"use client";

import { ArrowPathIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "../ui/cx";

/** The outcome of a payment, as `PaymentReturn` shows it. */
export type PaymentReturnState = "success" | "pending" | "failed";

/** The text and the next step for one state. */
export interface PaymentReturnContent {
  title: string;
  body: string;
  /** The button's link target. */
  href: string;
  /** The button's text. */
  cta: string;
  /** A smaller line under the body. */
  note?: string | undefined;
  /** Any more content under the body, such as a receipt link. */
  extra?: ReactNode;
}

/** Props for `PaymentReturn`. */
export interface PaymentReturnProps {
  state: PaymentReturnState;
  success: PaymentReturnContent;
  pending: PaymentReturnContent;
  failed: PaymentReturnContent;
  /** A function that checks the status again. While the state is pending, a button runs it. */
  onRefresh?: (() => void) | undefined;
  /** The refresh button's text. Defaults to `Check again`. */
  refreshLabel?: string | undefined;
  /** The classes for placing the component, on its outer element. */
  className?: string | undefined;
}

const ICONS = { success: CheckCircleIcon, pending: ClockIcon, failed: XCircleIcon } as const;
const ICON_COLOURS = { success: "text-payment-success", pending: "text-payment-pending", failed: "text-payment-failed" } as const;

const primary = "px-5 py-2.5 rounded-payment-button bg-button-primary-bg text-button-primary-text hover:brightness-110 text-sm font-medium transition";
const refresh = "px-4 py-2.5 rounded-payment-button bg-button-primary-bg/80 text-button-primary-text hover:bg-button-primary-bg text-sm font-medium transition-colors flex items-center gap-2";
const secondary = "py-2.5 rounded-payment-button bg-payment-secondary-bg hover:bg-payment-secondary-hover-bg text-payment-secondary-text text-sm transition-colors";

/**
 * Renders what a user sees on coming back from a payment provider: confirmed, still pending, or
 * failed. The app decides the state, such as with `usePollUntilFinal`.
 */
export function PaymentReturn({ state, success, pending, failed, onRefresh, refreshLabel = "Check again", className }: PaymentReturnProps) {
  const content = { success, pending, failed }[state];
  const Icon = ICONS[state];
  return (
    <div className={cx("max-w-md mx-auto px-4 py-12 flex flex-col items-center gap-5 text-center", className)}>
      <Icon className={cx("h-16 w-16", ICON_COLOURS[state])} aria-hidden />
      <h1 className="text-xl font-bold text-payment-title">{content.title}</h1>
      <p className="text-sm text-payment-text">{content.body}</p>
      {content.note && <p className="text-xs text-payment-note">{content.note}</p>}
      {content.extra}
      {state === "pending" ? (
        <div className="flex gap-2">
          {onRefresh && (
            <button type="button" onClick={onRefresh} className={refresh}>
              <ArrowPathIcon className="h-4 w-4" aria-hidden />
              {refreshLabel}
            </button>
          )}
          <Link href={content.href} className={cx(secondary, "px-4")}>{content.cta}</Link>
        </div>
      ) : (
        <Link href={content.href} className={state === "success" ? primary : cx(secondary, "px-5")}>{content.cta}</Link>
      )}
    </div>
  );
}
