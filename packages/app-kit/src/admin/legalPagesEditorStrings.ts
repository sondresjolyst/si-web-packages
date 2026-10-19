// Plain values, with no "use client", so a server component can import them.
import type { DefaultLegalPageKey } from "../legal/keys";

/**
 * The editor's text for each field error code of SjolystInnovation.AppKit.SiteSettings that saving a
 * legal page can give. `{max}` in `tooLong` becomes the title's character limit. The editor shows the
 * API's own message for a code that is not here.
 */
export interface LegalPagesValidationStrings {
  /** A blank title or content. The editor also shows it under a blank field before it calls the API. */
  required: string;
  tooLong: string;
}

/** The tab labels of the default legal pages, in English. */
export const defaultLegalPageKeyLabels: Record<DefaultLegalPageKey, string> = {
  terms: "Terms",
  privacy: "Privacy",
  cookies: "Cookies",
};

/** The legal pages editor's text. Pass the app's own language. The defaults are English. */
export interface LegalPagesEditorStrings {
  heading: string;
  title: string;
  bodyMarkdown: string;
  /** The title of the dot on a locale with no content yet. */
  notFilled: string;
  loading: string;
  save: string;
  saving: string;
  loadFailed: string;
  /** The message shown when the title or the content is blank. */
  required: string;
  saved: string;
  saveFailed: string;
  /** The heading of the list of saved versions of the open page. */
  revisionsHeading: string;
  /** Shown in place of the list while the open page has no saved versions. */
  noRevisions: string;
  revisionsFailed: string;
  /** The tag on the newest saved version, which is the text the page has now. */
  currentRevision: string;
  /** Written before the date of an opened version. */
  revisionSaved: string;
  closeRevision: string;
  revisionFailed: string;
  /** The field error texts, by code. Any code left out keeps its default. */
  validation: LegalPagesValidationStrings;
}

export const defaultLegalPagesEditorStrings: LegalPagesEditorStrings = {
  heading: "Legal pages",
  title: "Title",
  bodyMarkdown: "Content (Markdown)",
  notFilled: "Not filled in",
  loading: "Loading…",
  save: "Save",
  saving: "Saving…",
  loadFailed: "Failed to load the legal pages",
  required: "Fill in the title and the content",
  saved: "Page saved",
  saveFailed: "Failed to save the page",
  revisionsHeading: "Earlier versions",
  noRevisions: "No earlier versions",
  revisionsFailed: "Failed to load the earlier versions",
  currentRevision: "Current",
  revisionSaved: "Saved",
  closeRevision: "Close",
  revisionFailed: "Failed to open the version",
  validation: {
    required: "Required.",
    tooLong: "At most {max} characters.",
  },
};
