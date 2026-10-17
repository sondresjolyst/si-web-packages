// Plain values with no imports, so the api, seo, admin, and legal entry points can share them.

/**
 * The legal pages a site has when it picks none, the same default as the `Keys` option of
 * SjolystInnovation.AppKit.SiteSettings's `MapAppKitLegalPages`.
 */
export const LEGAL_PAGE_KEYS = ["terms", "privacy", "cookies"] as const;

/** A key of `LEGAL_PAGE_KEYS`. The legal page types and calls default to it. */
export type DefaultLegalPageKey = (typeof LEGAL_PAGE_KEYS)[number];
