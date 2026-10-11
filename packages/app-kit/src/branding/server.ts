import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Branding } from "./types";

export interface BrandingIconOptions {
  /** Loads the branding, such as a cached GET of `/branding`. Throws when the API cannot be reached. */
  load: () => Promise<Branding | null | undefined>;
  /** The bundled icon for when none is set, such as `public/icon.png`. */
  fallbackPath: string;
  /** Its content type, such as `image/png` or `image/svg+xml`. */
  fallbackType: string;
}

/**
 * The response for an `app/icon.ts` route: the favicon set in admin settings when it is a PNG,
 * JPEG, WebP, GIF or ICO, or the bundled one otherwise. Both carry `nosniff`, and a sandbox CSP
 * that a CSP header from the app's `next.config` replaces.
 * When the branding cannot be loaded it answers 503 with `no-store`, not the
 * bundled icon, since a browser would cache that in place of the one set in settings. The route
 * needs `dynamic = "force-dynamic"`, or the build bakes in the icon of the moment.
 */
export async function brandingIcon({ load, fallbackPath, fallbackType }: BrandingIconOptions): Promise<Response> {
  let branding: Branding | null | undefined;
  try {
    branding = await load();
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const type = branding?.iconContentType?.trim().toLowerCase();
  if (branding?.iconData && type && RASTER_TYPES.has(type)) {
    return new Response(new Uint8Array(Buffer.from(branding.iconData, "base64")), {
      headers: { "Content-Type": type, ...HARDENING },
    });
  }

  return new Response(new Uint8Array(await readFile(fallbackPath)), { headers: { "Content-Type": fallbackType, ...HARDENING } });
}

/**
 * The uploaded types the icon route serves. An SVG or HTML upload could carry script and would run
 * on the site's origin, so anything else gives the bundled icon instead.
 */
const RASTER_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/x-icon", "image/vnd.microsoft.icon"]);

/** Keeps a browser from sniffing the bytes as another type, and from running anything in them where the app sets no CSP. */
const HARDENING = { "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" };

/**
 * A short digest of icon bytes, for a URL that changes when the icon does, such as
 * `/icon?v=<digest>` in the web app manifest. Android refreshes a home screen icon only when the
 * manifest changes.
 */
export const iconVersion = (data: string | Buffer): string => createHash("sha256").update(data).digest("hex").slice(0, 12);
