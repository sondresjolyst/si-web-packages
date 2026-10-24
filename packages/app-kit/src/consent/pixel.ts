// The Meta Pixel calls, as plain functions with no "use client", so code outside React can track an
// event. Nothing here loads Meta's script unless MetaPixel asks for it after consent.
import { getConsent } from "./consentStore";

/** The script Meta's base code loads. */
export const META_PIXEL_SCRIPT_SRC = "https://connect.facebook.net/en_US/fbevents.js";

/** Meta's standard events. Any other name is sent as a custom event. */
const STANDARD_EVENTS = new Set([
  "AddPaymentInfo", "AddToCart", "AddToWishlist", "CompleteRegistration", "Contact", "CustomizeProduct", "Donate",
  "FindLocation", "InitiateCheckout", "Lead", "PageView", "Purchase", "Schedule", "Search", "StartTrial",
  "SubmitApplication", "Subscribe", "ViewContent",
]);

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
};

type PixelWindow = Window & { fbq?: Fbq; _fbq?: Fbq };

/** The pixel IDs each fbq has had `init` for, so a remount does not init twice. */
const initialized = new WeakMap<Fbq, Set<string>>();

/** Checks that a pixel ID is digits only, as Meta's are. */
export function isValidPixelId(pixelId: unknown): pixelId is string {
  return typeof pixelId === "string" && /^[0-9]+$/.test(pixelId);
}

/** Meta's base code, without the noscript image and without the PageView it sends at once. */
function installFbq(w: PixelWindow): Fbq {
  if (w.fbq) return w.fbq;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  w.fbq = fbq;
  if (!w._fbq) w._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = META_PIXEL_SCRIPT_SRC;
  document.head.appendChild(script);
  return fbq;
}

/** Loads the pixel and starts it for `pixelId`. Call it only once the visitor has consented. */
export function startPixel(pixelId: string): void {
  const fbq = installFbq(window as PixelWindow);
  fbq("consent", "grant");
  const ids = initialized.get(fbq) ?? new Set<string>();
  initialized.set(fbq, ids);
  if (ids.has(pixelId)) return;
  ids.add(pixelId);
  // No user data in init, so Advanced Matching stays off.
  fbq("init", pixelId);
}

/** Tells a loaded pixel that consent is withdrawn, and removes the cookies it set on this site. */
export function stopPixel(): void {
  const fbq = (window as PixelWindow).fbq;
  if (typeof fbq !== "function") return;
  fbq("consent", "revoke");
  const labels = window.location.hostname.split(".");
  const domains = [""];
  for (let i = 0; i < labels.length - 1; i++) domains.push(`; domain=.${labels.slice(i).join(".")}`);
  for (const name of ["_fbp", "_fbc"]) {
    for (const domain of domains) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
  }
}

/** Options for `trackPixel`. */
export interface TrackPixelOptions {
  /** The ID Meta uses to drop a duplicate of the event, such as an order reference. */
  eventID?: string | undefined;
}

/**
 * Sends an event to the Meta Pixel. It does nothing on the server, before the pixel has loaded, and
 * without marketing consent, so it is safe to call anywhere.
 */
export function trackPixel(event: string, params?: Record<string, unknown>, options?: TrackPixelOptions): void {
  if (typeof window === "undefined") return;
  const fbq = (window as PixelWindow).fbq;
  if (typeof fbq !== "function" || !getConsent().marketing) return;
  const args: unknown[] = [STANDARD_EVENTS.has(event) ? "track" : "trackCustom", event];
  if (params || options?.eventID) args.push(params ?? {});
  if (options?.eventID) args.push({ eventID: options.eventID });
  fbq(...args);
}
