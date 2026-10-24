"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { isValidPixelId, startPixel, stopPixel, trackPixel } from "./pixel";
import { useConsent } from "./useConsent";

/** Props for `MetaPixel`. */
export interface MetaPixelProps {
  /** The Meta Pixel ID, digits only. Anything else, or none, keeps the pixel off. */
  pixelId: string | null | undefined;
}

/**
 * Loads the Meta Pixel once the visitor accepts marketing, and sends a PageView for the first page and
 * each client navigation after it. Before consent, nothing from Meta is loaded. On withdrawal it
 * revokes consent in the pixel and sends nothing more. It renders nothing.
 */
export function MetaPixel({ pixelId }: MetaPixelProps) {
  const { marketing } = useConsent();
  const pathname = usePathname();
  const id = isValidPixelId(pixelId) ? pixelId : null;
  const active = id !== null && marketing;
  // The path the last PageView was for, so a rerender or a second effect run does not count it again.
  const tracked = useRef<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (marketing) startPixel(id);
    else stopPixel();
  }, [id, marketing]);

  useEffect(() => {
    if (!active || tracked.current === pathname) return;
    tracked.current = pathname;
    trackPixel("PageView");
  }, [active, pathname]);

  return null;
}
