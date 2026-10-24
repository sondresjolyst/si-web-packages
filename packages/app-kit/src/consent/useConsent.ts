"use client";

import { useSyncExternalStore } from "react";
import { getConsent, getServerConsent, subscribeConsent, type ConsentState } from "./consentStore";

/**
 * Reads the visitor's consent to marketing tools. The server and the first render in the browser
 * see `ready: false` and no consent, so the page hydrates without a mismatch. Storage is read right
 * after.
 */
export function useConsent(): ConsentState {
  return useSyncExternalStore(subscribeConsent, getConsent, getServerConsent);
}
