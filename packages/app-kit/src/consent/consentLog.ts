// Posts each consent choice to the app's consent log, so the choice can be shown later. Plain
// functions with no "use client", so a custom banner can log too.
import type { ConsentRecord } from "./consentStore";

/** The notice version the log gets when the app sets none, since the log requires one. */
export const DEFAULT_LOG_NOTICE_VERSION = "1";

/** Where the choice was made: the first ask, or the banner reopened from the settings link. */
export type ConsentSource = "banner" | "settings";

/** What the consent log receives. It holds no IP address and nothing about the visitor. */
export interface ConsentLogPayload {
  consentId: string;
  marketing: boolean;
  /** The notice version the choice was made for, or `"1"` when the app sets none. */
  noticeVersion: string;
  /** The stored record's `version`. */
  schemaVersion: number;
  source: ConsentSource;
}

/** Options for `logConsent`. */
export interface ConsentLogOptions {
  /** The URL of the consent log, such as the API's `/consent`. */
  endpoint: string;
  source: ConsentSource;
  /** The request's `credentials`. Defaults to `"omit"`, so no cookie goes with it. */
  credentials?: RequestCredentials | undefined;
}

/**
 * Posts a stored choice to the consent log and does not wait for it. `keepalive` lets the request
 * finish after the page unloads. A failed request is ignored, and the choice stands either way.
 */
export function logConsent(record: ConsentRecord, { endpoint, source, credentials = "omit" }: ConsentLogOptions): void {
  const payload: ConsentLogPayload = {
    consentId: record.consentId,
    marketing: record.marketing,
    noticeVersion: record.noticeVersion ?? DEFAULT_LOG_NOTICE_VERSION,
    schemaVersion: record.version,
    source,
  };
  try {
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials,
    }).catch(() => {});
  } catch {
    // fetch threw before it started, such as for a malformed URL. The choice stands.
  }
}
