// Plain values, with no "use client", so a server component can import them.

/**
 * The guard's text. Pass the app's own language. The defaults are English. Plain strings, so a
 * server component can pass them.
 */
export interface SessionExpiryGuardStrings {
  expiredTitle: string;
  expiredBody: string;
  /** Every `{minutes}` is replaced with the minutes left. */
  expiringSoon: string;
  reSignIn: string;
  notRestored: string;
  wrongUser: string;
  close: string;
}

export const defaultSessionExpiryGuardStrings: SessionExpiryGuardStrings = {
  expiredTitle: "Session expired",
  expiredBody: "Your session has expired. Sign in again to save.",
  expiringSoon: "Your session expires in {minutes} min. Sign in again to continue without interruption.",
  reSignIn: "Sign in again",
  notRestored: "We could not renew the session. Try again.",
  wrongUser: "This page belongs to a different user. Sign in with the same account.",
  close: "Close",
};
