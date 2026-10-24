"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { cx } from "../ui/cx";
import { withDefaults, type TextOverrides } from "../ui/withDefaults";
import { defaultConsentBannerStrings, type ConsentBannerStrings } from "./consentBannerStrings";
import { setConsent } from "./consentStore";
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
 * while there is no choice, and again after `openConsentSettings`. It is a labelled region at the
 * bottom of the page, not a modal, so the page stays usable behind it. It renders nothing on the
 * server, since the choice lives in the browser.
 */
export function ConsentBanner({ enabled, cookiesHref, className, strings }: ConsentBannerProps) {
  const text = withDefaults(defaultConsentBannerStrings, strings);
  const { ready, record, reopened } = useConsent();
  const headingId = useId();
  const bodyId = useId();
  const ref = useRef<HTMLElement>(null);
  const show = enabled && ready && (record === null || reopened);

  useEffect(() => {
    // A visitor who reopened the banner gets focus moved into it, and back to the opener once they choose.
    if (!show || !reopened) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, [show, reopened]);

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
        <h2 id={headingId} className="text-base font-bold text-dialog-title">
          {text.title}
        </h2>
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
          <button type="button" className={button} onClick={() => setConsent({ marketing: false })}>
            {text.reject}
          </button>
          <button type="button" className={button} onClick={() => setConsent({ marketing: true })}>
            {text.accept}
          </button>
        </div>
      </div>
    </section>
  );
}
