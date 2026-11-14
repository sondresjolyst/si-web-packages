"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getConsent, recheckConsent } from "./consentStore";
import { isValidTikTokPixelId, startTikTokPixel, stopTikTokPixel, tikTokPageRules } from "./tiktok";
import { useConsent } from "./useConsent";

/** Props for `TikTokPixel`. */
export interface TikTokPixelProps {
  /** The TikTok Pixel ID, 10 to 32 capital letters and digits. Anything else, or none, keeps the pixel off. */
  pixelId: string | null | undefined;
  /** The same `noticeVersion` as `ConsentBanner` gets. A choice made for another one counts as no consent. */
  noticeVersion?: string | undefined;
  /** The same `maxAgeDays` as `ConsentBanner` gets. An older choice counts as no consent. */
  maxAgeDays?: number | undefined;
}

/**
 * Loads the TikTok Pixel once the visitor accepts marketing, and sends a page view for the page where
 * it starts. The pixel counts later client navigations itself. Before consent, nothing from TikTok is
 * loaded. On withdrawal it removes the pixel's cookies, revokes consent in the pixel, and sends
 * nothing more. When the last TikTokPixel goes away, it revokes in the pixel and keeps the cookies.
 * It renders nothing.
 */
export function TikTokPixel({ pixelId, noticeVersion, maxAgeDays }: TikTokPixelProps) {
  const consent = useConsent({ noticeVersion, maxAgeDays });
  const { ready, marketing } = consent;
  const pathname = usePathname();
  const id = isValidTikTokPixelId(pixelId) ? pixelId : null;

  // A choice can grow too old in an open tab. Each navigation checks it again.
  useEffect(() => {
    recheckConsent();
  }, [pathname]);

  useEffect(() => {
    if (!id) return;
    // Every mount withdraws, under the rules of the page's first start, whatever its own rules are.
    // getConsent reads storage itself, so a consenting visitor's cookies stay while the page hydrates.
    if (!getConsent(tikTokPageRules() ?? { noticeVersion, maxAgeDays }).marketing) stopTikTokPixel();
  }, [id, consent, noticeVersion, maxAgeDays]);

  useEffect(() => {
    if (!id || !ready || !marketing) return;
    // The first start's ID and rules hold for the page, so a mount that disagrees does not start. On
    // unmount, a cleared ID, or a change of rules, this mount lets go, so no event is sent for it.
    return startTikTokPixel(id, { noticeVersion, maxAgeDays });
  }, [id, ready, marketing, noticeVersion, maxAgeDays]);

  return null;
}
