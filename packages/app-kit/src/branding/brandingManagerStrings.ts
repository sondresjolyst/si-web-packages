// Plain values, with no "use client", so a server component can import them.

/**
 * The branding form's text for each refusal code of SjolystInnovation.AppKit.SiteSettings that a
 * chosen file can get. The form shows the API's own message for a code that is not here.
 */
export interface BrandingValidationStrings {
  /** The file is not a PNG, JPEG, WebP, GIF, or ICO image. */
  invalidImage: string;
  /** The file is larger than 2 MB. */
  imageTooLarge: string;
}

/** The branding form's text. Pass the app's own language. The defaults are English. */
export interface BrandingManagerStrings {
  title: string;
  logo: string;
  logoHint: string;
  icon: string;
  iconHint: string;
  none: string;
  choose: string;
  remove: string;
  save: string;
  saving: string;
  saved: string;
  saveFailed: string;
  /** The refusal texts, by code. Any code left out keeps its default. */
  validation: BrandingValidationStrings;
}

export const defaultBrandingManagerStrings: BrandingManagerStrings = {
  title: "Branding",
  logo: "Logo",
  logoHint: "Shown in the navbar and footer. PNG, JPEG, WebP, or GIF, max 2 MB.",
  icon: "Icon (favicon)",
  iconHint: "Browser tab icon. Square PNG or ICO, max 2 MB.",
  none: "none",
  choose: "Choose",
  remove: "Remove",
  save: "Save branding",
  saving: "Saving…",
  saved: "Branding saved",
  saveFailed: "Failed to save branding",
  validation: {
    invalidImage: "The image must be a PNG, JPEG, WebP, GIF or ICO file of at most 2 MB.",
    imageTooLarge: "The image must be a PNG, JPEG, WebP, GIF or ICO file of at most 2 MB.",
  },
};
