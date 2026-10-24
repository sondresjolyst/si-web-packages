"use client";

import { useMemo, useSyncExternalStore } from "react";
import { applyConsentOptions, getServerConsent, getStoredConsent, subscribeConsent, type ConsentOptions, type ConsentState } from "./consentStore";

/**
 * Reads the visitor's consent to marketing tools. The server and the first render in the browser
 * see `ready: false` and no consent, so the page hydrates without a mismatch. Storage is read right
 * after. A choice made for another `noticeVersion`, or older than `maxAgeDays`, counts as no choice.
 */
export function useConsent(options: ConsentOptions = {}): ConsentState {
  const { noticeVersion, maxAgeDays } = options;
  const stored = useSyncExternalStore(subscribeConsent, getStoredConsent, getServerConsent);
  return useMemo(() => applyConsentOptions(stored, { noticeVersion, maxAgeDays }), [stored, noticeVersion, maxAgeDays]);
}
