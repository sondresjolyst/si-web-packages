"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { cx } from "../ui/cx";
import { withDefaults, type TextOverrides } from "../ui/withDefaults";
import { defaultConsentBannerStrings, type ConsentBannerStrings } from "./consentBannerStrings";
import { logConsent } from "./consentLog";
import { closeConsentSettings, setConsent } from "./consentStore";
import { useConsent } from "./useConsent";

/** Props for `ConsentBanner`. */
export interface ConsentBannerProps {
  /**
   * Whether the app uses a marketing tool that needs consent, such as when it has a pixel ID. When it
   * is false, the banner never shows, since there is nothing to ask about.
   */
  enabled: boolean;
  /** The path of the page that describes the cookies, such as `/cookies`. */
  cookiesHref: string;
  /**
   * The version of the notice the visitor agrees to, such as the date the cookie page last changed.
   * Use 1 to 64 of the characters A to Z, a to z, 0 to 9, dot, underscore and hyphen, which the consent
   * log accepts.
   * It is stored with the choice, and a choice made for another version is asked for again. Pass the
   * same value to `MetaPixel`.
   */
  noticeVersion?: string | undefined;
  /** How many days a choice holds before the banner asks again. Defaults to 365. Pass the same value to `MetaPixel`. */
  maxAgeDays?: number | undefined;
  /**
   * The URL of the consent log, such as the API's `/consent`. Every choice is posted there, without
   * waiting for an answer. Leave it out to keep no log.
   */
  logEndpoint?: string | undefined;
  /** The `credentials` for the log request. Defaults to `"omit"`, so no cookie goes with it. */
  logCredentials?: RequestCredentials | undefined;
  /** Classes for placing it, on the outer element. */
  className?: string | undefined;
  strings?: TextOverrides<ConsentBannerStrings> | undefined;
}

// Both buttons share one class, so neither choice looks like the expected one.
const button =
  "w-full rounded-button border border-button-secondary-border px-4 py-2.5 text-sm font-semibold text-button-secondary-text " +
  "hover:bg-button-secondary-hover-bg focus:outline-hidden focus-visible:ring-(length:--input-focus-ring-width) " +
  "focus-visible:ring-input-focus-ring focus-visible:ring-offset-2";

/**
 * Asks for consent to marketing and ad measurement, with Accept and Reject as equal choices. It shows
 * while there is no choice, and again after `openConsentSettings`. Reopened over an earlier choice, it
 * also has a close button, and Escape closes it, both keeping that choice. It is a labelled region at
 * the bottom of the page, not a modal, so the page stays usable behind it. It renders nothing on the
 * server, since the choice lives in the browser.
 */
export function ConsentBanner({
  enabled,
  cookiesHref,
  noticeVersion,
  maxAgeDays,
  logEndpoint,
  logCredentials,
  className,
  strings,
}: ConsentBannerProps) {
  const text = withDefaults(defaultConsentBannerStrings, strings);
  const { ready, record, reopened } = useConsent({ noticeVersion, maxAgeDays });
  const headingId = useId();
  const bodyId = useId();
  const ref = useRef<HTMLElement>(null);
  const show = enabled && ready && (record === null || reopened);
  // Only a visitor who has already chosen may close it without choosing.
  const closable = show && record !== null;

  useEffect(() => {
    // A visitor who reopened the banner gets focus moved into it, and back to the opener once they choose.
    if (!show || !reopened) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, [show, reopened]);

  useEffect(() => {
    if (!closable) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeConsentSettings();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closable]);

  const choose = (marketing: boolean) => {
    const saved = setConsent({ marketing, noticeVersion });
    if (logEndpoint) logConsent(saved, { endpoint: logEndpoint, source: reopened ? "settings" : "banner", credentials: logCredentials });
  };

  if (!show) return null;

  return (
    <section
      ref={ref}
      role="region"
      aria-labelledby={headingId}
      aria-describedby={bodyId}
      tabIndex={-1}
      className={cx("pointer-events-none fixed inset-x-0 bottom-0 z-40 p-4 focus:outline-hidden sm:p-6", className)}
    >
      <div className="pointer-events-auto mx-auto max-w-2xl rounded-dialog border border-button-secondary-border bg-dialog-bg p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id={headingId} className="text-base font-bold text-dialog-title">
            {text.title}
          </h2>
          {closable && (
            <button
              type="button"
              onClick={closeConsentSettings}
              className="text-sm font-semibold text-dialog-text underline underline-offset-2 hover:no-underline focus:outline-hidden focus-visible:ring-(length:--input-focus-ring-width) focus-visible:ring-input-focus-ring"
            >
              {text.close}
            </button>
          )}
        </div>
        <p id={bodyId} className="mt-1 text-sm text-dialog-text">
          {text.body}{" "}
          <Link
            href={cookiesHref}
            className="font-semibold text-dialog-title underline underline-offset-2 focus:outline-hidden focus-visible:ring-(length:--input-focus-ring-width) focus-visible:ring-input-focus-ring"
          >
            {text.cookiePolicy}
          </Link>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" className={button} onClick={() => choose(false)}>
            {text.reject}
          </button>
          <button type="button" className={button} onClick={() => choose(true)}>
            {text.accept}
          </button>
        </div>
      </div>
    </section>
  );
}
