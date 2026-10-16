/** The business as SjolystInnovation.AppKit.SiteSettings's public `/company` endpoint describes it. */
export interface CompanyInfo {
  name: string;
  legalName: string;
  orgNumber: string;
  vatRegistered: boolean;
  /** The address on one line, for display. The API derives it from the parts below. */
  address: string;
  streetAddress: string;
  postalCode: string;
  addressLocality: string;
  addressRegion: string;
  email: string;
  phone: string;
}

/** What the app knows about the business without the API. Only the name is required. */
export type CompanyFallback = Partial<CompanyInfo> & { name: string };

/**
 * The company details for public pages: the API's answer, with the app's own values for any field
 * it left blank or could not give. The legal name falls back to the name, and VAT to not registered.
 */
export function mergeCompanyInfo(data: Partial<CompanyInfo> | null | undefined, fallback: CompanyFallback): CompanyInfo {
  const name = data?.name || fallback.name;
  const pick = (key: Exclude<keyof CompanyInfo, "name" | "legalName" | "vatRegistered">) => data?.[key] || fallback[key] || "";
  return {
    name,
    legalName: data?.legalName || fallback.legalName || name,
    orgNumber: pick("orgNumber"),
    vatRegistered: data?.vatRegistered ?? fallback.vatRegistered ?? false,
    address: pick("address"),
    streetAddress: pick("streetAddress"),
    postalCode: pick("postalCode"),
    addressLocality: pick("addressLocality"),
    addressRegion: pick("addressRegion"),
    email: pick("email"),
    phone: pick("phone"),
  };
}

/** The org number with the Norwegian ` MVA` suffix once the business is VAT registered. Empty without a number. */
export function formatOrgNumber({ orgNumber, vatRegistered }: { orgNumber?: string | null | undefined; vatRegistered?: boolean | null | undefined }): string {
  if (!orgNumber) return "";
  return vatRegistered ? `${orgNumber} MVA` : orgNumber;
}
