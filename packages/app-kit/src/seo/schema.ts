/** One schema.org node. Nodes share a `@graph` and refer to each other by `@id`. */
export interface SchemaNode {
  "@type": string | string[];
  "@id"?: string;
  [key: string]: unknown;
}

/** A reference to another node in the same graph. */
export interface SchemaRef {
  "@id": string;
}

/** Creates a reference to the node with this `@id`. */
export const ref = (id: string): SchemaRef => ({ "@id": id });

/** Serializes the JSON-LD document for one page. `<` is escaped, so the payload cannot close the script tag. */
export function serializeGraph(nodes: SchemaNode[]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": nodes,
  }).replace(/</g, "\\u003c");
}

/**
 * The business as the API describes it. The structured data leaves out blank fields, except the
 * street address, which falls back to the one-line address.
 */
export interface OrganizationInfo {
  name: string;
  legalName?: string | undefined;
  orgNumber?: string | undefined;
  vatRegistered?: boolean | undefined;
  /** The address on one line. Used for the street when `streetAddress` is blank. */
  address?: string | undefined;
  streetAddress?: string | undefined;
  postalCode?: string | undefined;
  addressLocality?: string | undefined;
  addressRegion?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
}
