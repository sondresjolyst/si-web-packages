// The Meta Pixel calls, as plain functions with no "use client", so code outside React can track an
// event. Nothing here loads Meta's script unless MetaPixel asks for it after consent.
import { DEFAULT_CONSENT_MAX_AGE_DAYS, getConsent, getStoredConsent, type ConsentOptions } from "./consentStore";

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

/** What this page's pixel is doing. It hangs off the fbq it belongs to, so every mount shares it. */
interface PixelState {
  /** The ID the pixel was started with. fbq cannot drop an ID once it has had `init`. */
  pixelId: string;
  /** The rules of the first start. Every event checks the choice against them again. */
  options: ConsentOptions;
  /** The path of the last PageView sent, so two mounts or a rerender do not count a page twice. */
  lastPath: string | null;
  /** How many MetaPixel mounts run the pixel now. Events are sent only while one does. */
  holders: number;
  /** Counts the stops, so a release from before a stop does not let go of a later start. */
  generation: number;
}

const states = new WeakMap<Fbq, PixelState>();

/** Checks that a pixel ID is digits only, as Meta's are. */
export function isValidPixelId(pixelId: unknown): pixelId is string {
  return typeof pixelId === "string" && /^[0-9]+$/.test(pixelId);
}

function pageState(): PixelState | undefined {
  const fbq = (window as PixelWindow).fbq;
  return fbq ? states.get(fbq) : undefined;
}

const sameRules = (a: ConsentOptions, b: ConsentOptions) =>
  a.noticeVersion === b.noticeVersion && (a.maxAgeDays ?? DEFAULT_CONSENT_MAX_AGE_DAYS) === (b.maxAgeDays ?? DEFAULT_CONSENT_MAX_AGE_DAYS);

/**
 * Checks whether the pixel already runs with another ID or other rules. The first start decides both
 * for the rest of the page, since fbq cannot drop an ID, and a mount that disagrees is ignored with a
 * warning in development.
 */
export function conflictsWithPage(pixelId: string, options: ConsentOptions): boolean {
  const state = pageState();
  if (!state || (state.pixelId === pixelId && sameRules(state.options, options))) return false;
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `MetaPixel: the pixel already runs with ${state.pixelId} and its first noticeVersion and maxAgeDays, ` +
        `so ${pixelId} with these rules is ignored until the page reloads.`,
    );
  }
  return true;
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

/**
 * Loads the pixel and starts it for `pixelId`. Call it only once the visitor has consented. Returns a
 * function that lets go of this start, such as when the mount goes away, or null when the pixel
 * already runs with another ID or other rules. Once every start is let go, no event is sent.
 */
export function startPixel(pixelId: string, options: ConsentOptions = {}): (() => void) | null {
  if (conflictsWithPage(pixelId, options)) return null;
  const fbq = installFbq(window as PixelWindow);
  fbq("consent", "grant");
  let state = states.get(fbq);
  if (!state) {
    state = { pixelId, options, lastPath: null, holders: 0, generation: 0 };
    states.set(fbq, state);
    // No user data in init, so Advanced Matching stays off.
    fbq("init", pixelId);
  }
  state.holders++;
  const held = state;
  const generation = held.generation;
  let released = false;
  return () => {
    if (released || held.generation !== generation) return;
    released = true;
    held.holders--;
  };
}

/** Removes the cookies the pixel sets on this site, on the host and each parent domain. */
export function clearPixelCookies(hostname: string = window.location.hostname): void {
  const labels = hostname.split(".");
  const domains = [""];
  for (let i = 0; i < labels.length - 1; i++) domains.push(`; domain=.${labels.slice(i).join(".")}`);
  for (const name of ["_fbp", "_fbc"]) {
    for (const domain of domains) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
  }
}

/**
 * Removes the pixel's cookies, even those left from an earlier visit, and tells a loaded pixel that
 * consent is withdrawn. Nothing more is sent until `startPixel`.
 */
export function stopPixel(): void {
  clearPixelCookies();
  const fbq = (window as PixelWindow).fbq;
  if (typeof fbq !== "function") return;
  fbq("consent", "revoke");
  const state = states.get(fbq);
  if (state) {
    state.holders = 0;
    state.generation++;
    // The next grant counts the page it happens on.
    state.lastPath = null;
  }
}

/** Sends a PageView for `path`, once per page, while the pixel runs for `pixelId`. */
export function trackPageView(pixelId: string, path: string): void {
  const state = pageState();
  if (!state || state.pixelId !== pixelId || state.lastPath === path) return;
  // Only a PageView that went out counts, so a blocked one is sent once sending resumes.
  if (send("PageView")) state.lastPath = path;
}

/** Options for `trackPixel`. */
export interface TrackPixelOptions {
  /** The ID Meta uses to drop a duplicate of the event, such as an order reference. */
  eventID?: string | undefined;
}

/** Sends an event if the pixel may send, and tells whether it did. */
function send(event: string, params?: Record<string, unknown>, options?: TrackPixelOptions): boolean {
  if (typeof window === "undefined") return false;
  const fbq = (window as PixelWindow).fbq;
  if (typeof fbq !== "function") return false;
  // The pixel this module started sends only while a MetaPixel runs it, and checks the choice under
  // its own notice version and age, now, so an event stops the moment the choice expires. Another fbq
  // goes by the stored choice.
  const state = states.get(fbq);
  const consents = state ? state.holders > 0 && getConsent(state.options).marketing : getStoredConsent().marketing;
  if (!consents) return false;
  const args: unknown[] = [STANDARD_EVENTS.has(event) ? "track" : "trackCustom", event];
  if (params || options?.eventID) args.push(params ?? {});
  if (options?.eventID) args.push({ eventID: options.eventID });
  fbq(...args);
  return true;
}

/**
 * Sends an event to the Meta Pixel. It does nothing on the server, before the pixel has loaded, and
 * without marketing consent, so it is safe to call anywhere.
 */
export function trackPixel(event: string, params?: Record<string, unknown>, options?: TrackPixelOptions): void {
  send(event, params, options);
}
