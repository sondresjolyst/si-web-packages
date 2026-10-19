// Types only, with no imports, so the legal page view can use them without axios or next-auth.

/** A legal page, as SjolystInnovation.AppKit.SiteSettings's legal endpoints return it. */
export interface LegalPage<Key extends string = string> {
  key: Key;
  locale: string;
  title: string;
  bodyMarkdown: string;
  updatedAt: string;
}

/** A saved version of a legal page in the list of versions, as the revisions endpoint returns it. */
export interface LegalPageRevisionSummary {
  id: number;
  savedAt: string;
  title: string;
}

/** A saved version of a legal page with its body, as the revision endpoint returns it. */
export interface LegalPageRevision extends LegalPageRevisionSummary {
  key: string;
  locale: string;
  bodyMarkdown: string;
  /** The user id of the admin who saved it, or null when not known. */
  savedBy: string | null;
}
