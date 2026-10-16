"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toDataUrl, type Branding } from "./types";

/** What `useBranding` returns. */
export interface BrandingContextValue {
  branding: Branding;
  /** The logo as a `data:` URL, or null when none is set. */
  logoUrl: string | null;
  /** Loads the branding again, such as after saving it. */
  refresh: () => void;
}

const BrandingContext = createContext<BrandingContextValue>({ branding: {}, logoUrl: null, refresh: () => {} });

/** Gets the branding from the nearest `BrandingProvider`. Returns empty branding outside one. */
export const useBranding = () => useContext(BrandingContext);

/** How often the provider loads the branding again, so an open tab picks up a change. */
export const BRANDING_REFRESH_MS = 5 * 60 * 1000;

/** Props for `BrandingProvider`. */
export interface BrandingProviderProps {
  children: ReactNode;
  /** A function that loads the branding, such as a GET of `/branding`. On a failure the provider keeps the branding it has. */
  load: () => Promise<Branding>;
  /** The branding the server rendered with. Without it, the provider loads it on mount. */
  initial?: Branding | undefined;
}

/** Provides the logo and favicon to the components below it, and loads them again every five minutes. */
export function BrandingProvider({ children, load, initial }: BrandingProviderProps) {
  const [branding, setBranding] = useState<Branding>(initial ?? {});
  // The latest load, so an inline function does not restart the refresh timer on every render.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);
  const hasInitial = initial !== undefined;

  const refresh = useCallback(() => {
    loadRef.current().then(setBranding).catch(() => {});
  }, []);

  useEffect(() => {
    if (!hasInitial) refresh();
    const id = setInterval(refresh, BRANDING_REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh, hasInitial]);

  const logoUrl = toDataUrl(branding.logoData, branding.logoContentType);

  return <BrandingContext.Provider value={{ branding, logoUrl, refresh }}>{children}</BrandingContext.Provider>;
}
