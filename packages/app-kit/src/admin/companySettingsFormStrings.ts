// Plain values, with no "use client", so a server component can import them.

/**
 * The form's text for each field error code of SjolystInnovation.AppKit.SiteSettings. `{max}` in
 * `tooLong` becomes the field's character limit. The form shows the API's own message for a code
 * that is not here.
 */
export interface CompanySettingsValidationStrings {
  required: string;
  tooLong: string;
  invalidEmail: string;
  orgNumberRequiredForVat: string;
  invalidOrgNumber: string;
  invalidPostalCode: string;
  placeRequired: string;
}

/** The company settings form's text. Pass the app's own language. The defaults are English. */
export interface CompanySettingsFormStrings {
  contactRecipient: string;
  contactRecipientHint: string;
  companyName: string;
  legalName: string;
  legalNameHint: string;
  orgNumber: string;
  vatRegistered: string;
  vatHint: string;
  streetAddress: string;
  postalCode: string;
  addressLocality: string;
  addressRegion: string;
  addressHint: string;
  publicEmail: string;
  publicPhone: string;
  loading: string;
  save: string;
  saving: string;
  loadFailed: string;
  saved: string;
  saveFailed: string;
  /** The field error texts, by code. Any code left out keeps its default. */
  validation: CompanySettingsValidationStrings;
}

export const defaultCompanySettingsFormStrings: CompanySettingsFormStrings = {
  contactRecipient: "Contact enquiry recipient",
  contactRecipientHint: "Contact form enquiries are emailed to this address.",
  companyName: "Company name",
  legalName: "Legal name",
  legalNameHint: "The registered name. Leave blank to use the company name.",
  orgNumber: "Organisation number",
  vatRegistered: "VAT (MVA) registered",
  vatHint: "When on, the org number is shown with the “MVA” suffix.",
  streetAddress: "Street address",
  postalCode: "Postal code",
  addressLocality: "Place",
  addressRegion: "County",
  addressHint: "The county is optional.",
  publicEmail: "Public email",
  publicPhone: "Public phone",
  loading: "Loading…",
  save: "Save",
  saving: "Saving…",
  loadFailed: "Failed to load settings",
  saved: "Settings saved",
  saveFailed: "Failed to save",
  validation: {
    required: "Required.",
    tooLong: "At most {max} characters.",
    invalidEmail: "Not a valid email address.",
    orgNumberRequiredForVat: "An organisation number is required when the business is VAT registered.",
    invalidOrgNumber: "Not a valid organisation number. It has nine digits and ends in a check digit.",
    invalidPostalCode: "A Norwegian postal code is four digits.",
    placeRequired: "A postal code needs the place name that goes with it.",
  },
};
