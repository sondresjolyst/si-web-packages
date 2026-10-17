// Plain values, with no "use client", so a server component can import them.

/**
 * The email stats panel's text. Pass the app's own language. The defaults are English. The panel
 * fills in `{days}` in `title`.
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
  loading: "Loading…",
  unavailable: "Unavailable.",
};
