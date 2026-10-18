// Plain values, with no "use client", so a server component can import them.

/**
 * The email stats panel's text. Pass the app's own language. The defaults are English. The panel
 * fills in `{days}` in `title` and `periodOption`.
 */
export interface EmailStatsPanelStrings {
  title: string;
  /** The emails the app asked Brevo to send. */
  sent: string;
  delivered: string;
  /** Hard and soft bounces together. */
  bounces: string;
  /** Blocked emails and spam reports together. */
  blocked: string;
  /** The rows of `separateCounts`, each count on its own. */
  hardBounces: string;
  softBounces: string;
  /** Blocked emails without spam reports. */
  blockedOnly: string;
  spamReports: string;
  /** Emails to an address that does not exist or cannot be used. */
  invalid: string;
  /** The name of the period picker, for screen readers. */
  period: string;
  /** Each choice in the period picker, such as `7 days`. */
  periodOption: string;
  loading: string;
  /** The text shown when the stats could not load, such as when Brevo does not answer. */
  unavailable: string;
}

export const defaultEmailStatsPanelStrings: EmailStatsPanelStrings = {
  title: "Email (last {days} days)",
  sent: "Sent",
  delivered: "Delivered",
  bounces: "Bounces",
  blocked: "Blocked / spam",
  hardBounces: "Hard bounces",
  softBounces: "Soft bounces",
  blockedOnly: "Blocked",
  spamReports: "Spam reports",
  invalid: "Invalid",
  period: "Period",
  periodOption: "{days} days",
  loading: "Loading…",
  unavailable: "Unavailable.",
};
