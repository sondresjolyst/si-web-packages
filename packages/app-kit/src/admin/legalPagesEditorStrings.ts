// Plain values, with no "use client", so a server component can import them.

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
  validation: {
    required: "Required.",
    tooLong: "At most {max} characters.",
  },
};
