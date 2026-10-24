"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isValidPixelId, startPixel, stopPixel, trackPageView } from "./pixel";
import { useConsent } from "./useConsent";

/** Props for `MetaPixel`. */
export interface MetaPixelProps {
  /** The Meta Pixel ID, digits only. Anything else, or none, keeps the pixel off. */
  pixelId: string | null | undefined;
  /** The same `noticeVersion` as `ConsentBanner` gets. A choice made for another one counts as no consent. */
  noticeVersion?: string | undefined;
  /** The same `maxAgeDays` as `ConsentBanner` gets. An older choice counts as no consent. */
  maxAgeDays?: number | undefined;
}

/**
 * Loads the Meta Pixel once the visitor accepts marketing, and sends a PageView for the page and each
 * client navigation to a new path. Before consent, nothing from Meta is loaded. On withdrawal it
 * removes the pixel's cookies, revokes consent in the pixel, and sends nothing more. It renders nothing.
 */
export function MetaPixel({ pixelId, noticeVersion, maxAgeDays }: MetaPixelProps) {
  const { ready, marketing } = useConsent({ noticeVersion, maxAgeDays });
  const pathname = usePathname();
  const id = isValidPixelId(pixelId) ? pixelId : null;

  useEffect(() => {
    // Before storage is read there is no choice yet, and a consenting visitor's cookies must stay.
    if (!id || !ready) return;
    if (marketing) startPixel(id);
    else stopPixel();
  }, [id, ready, marketing]);

  useEffect(() => {
    if (id && marketing) trackPageView(id, pathname);
  }, [id, marketing, pathname]);

  return null;
}
