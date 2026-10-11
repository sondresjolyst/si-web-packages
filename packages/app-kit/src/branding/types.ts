/** The logo and favicon set in admin settings, as the API's `/branding` endpoint returns them. */
export interface Branding {
  /** Base64 image bytes. */
  logoData?: string | null | undefined;
  logoContentType?: string | null | undefined;
  /** Base64 image bytes. */
  iconData?: string | null | undefined;
  iconContentType?: string | null | undefined;
}

/** A `data:` URL for base64 image bytes, or null when either part is missing. */
export const toDataUrl = (data?: string | null, contentType?: string | null): string | null =>
  data && contentType ? `data:${contentType};base64,${data}` : null;
