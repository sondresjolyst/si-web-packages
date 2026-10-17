// Types only, with no imports, so the legal page view can use them without axios or next-auth.

/** A legal page, as SjolystInnovation.AppKit.SiteSettings's legal endpoints return it. */
export interface LegalPage<Key extends string = string> {
  key: Key;
  locale: string;
  title: string;
  bodyMarkdown: string;
  updatedAt: string;
}
