// Plain values, with no "use client", so a server component can import them.

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
  /** When the title or the content is blank. */
  required: string;
  saved: string;
  saveFailed: string;
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
};
