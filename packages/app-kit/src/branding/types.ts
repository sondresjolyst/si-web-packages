/** The logo and favicon set in admin settings, as the API's `/branding` endpoint returns them. */
export interface Branding {
  /** The logo's image bytes, in base64. */
  logoData?: string | null | undefined;
  logoContentType?: string | null | undefined;
  /** The favicon's image bytes, in base64. */
  iconData?: string | null | undefined;
  iconContentType?: string | null | undefined;
}

/** Builds a `data:` URL for base64 image bytes. Returns null when either part is missing. */
export const toDataUrl = (data?: string | null, contentType?: string | null): string | null =>
  data && contentType ? `data:${contentType};base64,${data}` : null;
