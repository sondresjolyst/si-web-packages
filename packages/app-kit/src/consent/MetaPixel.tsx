"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { recheckConsent } from "./consentStore";
import { conflictsWithPage, isValidPixelId, startPixel, stopPixel, trackPageView } from "./pixel";
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

  // A choice can grow too old in an open tab. Each navigation checks it again.
  useEffect(() => {
    recheckConsent();
  }, [pathname]);

  useEffect(() => {
    // Before storage is read there is no choice yet, and a consenting visitor's cookies must stay.
    if (!id || !ready) return;
    const rules = { noticeVersion, maxAgeDays };
    // The first mount's ID and rules hold for the page. A mount that disagrees neither starts nor stops it.
    if (conflictsWithPage(id, rules)) return;
    if (!marketing) {
      stopPixel();
      return;
    }
    // On unmount, a cleared ID, or a change of rules, this mount lets go, so no event is sent for it.
    return startPixel(id, rules) ?? undefined;
  }, [id, ready, marketing, noticeVersion, maxAgeDays]);

  useEffect(() => {
    if (id && marketing) trackPageView(id, pathname);
  }, [id, marketing, pathname]);

  return null;
}
