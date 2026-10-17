// Plain values, with no "use client", so a server component can import them.

/** The legal page's text around the content. Pass the app's own language. The defaults are English. */
export interface LegalPageViewStrings {
  /** The text before the date the page last changed. */
  updated: string;
  /** The text shown in place of the content when nobody has written the page yet. */
  missing: string;
  /** The text of the link back to the front page. */
  toFrontPage: string;
}

export const defaultLegalPageViewStrings: LegalPageViewStrings = {
  updated: "Last updated",
  missing: "This content has not been written yet.",
  toFrontPage: "Back to the front page",
};
