// The TikTok Pixel calls, as plain functions with no "use client", so code outside React can track an
// event. Nothing here loads TikTok's script unless TikTokPixel asks for it after consent.
import { DEFAULT_CONSENT_MAX_AGE_DAYS, getConsent, getStoredConsent, subscribeConsent, type ConsentOptions } from "./consentStore";

/** The script TikTok's base code loads. */
export const TIKTOK_PIXEL_SCRIPT_SRC = "https://analytics.tiktok.com/i18n/pixel/events.js";

/** The global the base code puts the pixel on, which it also passes to the script as `lib`. */
const GLOBAL_NAME = "ttq";

/** The methods of TikTok's base code, with the three that consent mode adds. */
const METHODS = [
  "page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie",
  "disableCookie", "holdConsent", "revokeConsent", "grantConsent",
];

/** An array the base code queues calls on, with a method added for each name in `methods`. */
type Deferred = unknown[][] & Record<string, unknown>;

/** The parts of ttq the base code adds. A ttq another script made may lack some of them. */
interface TtqParts {
  methods: string[];
  setAndDefer: (target: Deferred, method: string) => void;
  instance: (pixelId: string) => Deferred;
  load: (pixelId: string, options?: Record<string, unknown>) => void;
  _i?: Record<string, Deferred & { _u?: string }>;
  _t?: Record<string, number>;
  _o?: Record<string, Record<string, unknown>>;
}

type Ttq = Deferred & TtqParts;

type TikTokWindow = Window & { ttq?: unknown; TiktokAnalyticsObject?: string };

/** What this page's pixel is doing. It hangs off the ttq it belongs to, so every mount shares it. */
interface TikTokPixelState {
  /** The ID the pixel was loaded with. The page keeps it until it reloads. */
  pixelId: string;
  /** The rules of the first start. Every event checks the choice against them again. */
  options: ConsentOptions;
  /** How many TikTokPixel mounts run the pixel now. Events are sent only while one does. */
  holders: number;
  /** Counts the stops, so a release from before a stop does not let go of a later start. */
  generation: number;
  /** Whether consent is granted in ttq now. A hold or a revoke ends it. */
  granted: boolean;
  /** Whether consent is revoked in ttq now, so a repeated stop does not revoke again. */
  revoked: boolean;
  /**
   * When the choice in force at the last hold was made, or undefined when the pixel is not held. A
   * start under another choice drops the held queue first.
   */
  heldDecidedAt?: string | undefined;
}

const states = new WeakMap<Ttq, TikTokPixelState>();

/** Checks that a pixel ID is 10 to 32 capital letters and digits, as TikTok's are. */
export function isValidTikTokPixelId(pixelId: unknown): pixelId is string {
  return typeof pixelId === "string" && /^[A-Z0-9]{10,32}$/.test(pixelId);
}

/** Gives the page's ttq. Only an array counts, as the base code makes one. */
function pageTtq(): Ttq | undefined {
  const ttq = (window as TikTokWindow).ttq;
  return Array.isArray(ttq) ? (ttq as Ttq) : undefined;
}

function pageState(): TikTokPixelState | undefined {
  const ttq = pageTtq();
  return ttq ? states.get(ttq) : undefined;
}

/** The rules of the page's first start, which decide consent for every mount, or undefined before it. */
export function tikTokPageRules(): ConsentOptions | undefined {
  return pageState()?.options;
}

const sameRules = (a: ConsentOptions, b: ConsentOptions) =>
  a.noticeVersion === b.noticeVersion && (a.maxAgeDays ?? DEFAULT_CONSENT_MAX_AGE_DAYS) === (b.maxAgeDays ?? DEFAULT_CONSENT_MAX_AGE_DAYS);

/**
 * Checks whether the pixel already runs with another ID or other rules. The first start decides both
 * for the rest of the page, and a mount that disagrees is ignored with a warning in development.
 */
function conflictsWithPage(pixelId: string, options: ConsentOptions): boolean {
  const state = pageState();
  if (!state || (state.pixelId === pixelId && sameRules(state.options, options))) return false;
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `TikTokPixel: the pixel already runs with ${state.pixelId} and its first noticeVersion and maxAgeDays, ` +
        `so ${pixelId} with these rules is ignored until the page reloads.`,
    );
  }
  return true;
}

/**
 * TikTok's base code with the consent mode methods, without the load and the page view it does at
 * once. It adds the script before the page's first script, as the base code does, or to the head
 * when the page has no script. A ttq already on the page is kept, and gets whatever it lacks of the
 * base code, such as the consent mode methods. Returns undefined when `window.ttq` is something
 * other than an array, since the base code would not run on it either.
 */
function installTtq(w: TikTokWindow): Ttq | undefined {
  if (w.ttq !== undefined && !pageTtq()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("TikTokPixel: window.ttq is not TikTok's pixel, so the pixel does not start.");
    }
    return undefined;
  }
  let ttq = pageTtq();
  if (!ttq) {
    w.TiktokAnalyticsObject = GLOBAL_NAME;
    ttq = [] as unknown as Ttq;
    w.ttq = ttq;
  }
  const full = ttq;
  const parts = ttq as Deferred & Partial<TtqParts>;
  if (!Array.isArray(parts.methods)) parts.methods = [];
  for (const method of METHODS) if (!parts.methods.includes(method)) parts.methods.push(method);
  parts.setAndDefer ??= (target, method) => {
    target[method] = (...args: unknown[]) => {
      target.push([method, ...args]);
    };
  };
  for (const method of parts.methods) if (typeof full[method] !== "function") parts.setAndDefer(full, method);
  parts.instance ??= pixelId => {
    const instance = full._i?.[pixelId] ?? ([] as unknown as Deferred);
    for (const method of full.methods) full.setAndDefer(instance, method);
    return instance;
  };
  parts.load ??= (pixelId, options) => {
    const ttq = full;
    const src = TIKTOK_PIXEL_SCRIPT_SRC;
    ttq._i = ttq._i ?? {};
    const queue = [] as unknown as Deferred & { _u?: string };
    queue._u = src;
    ttq._i[pixelId] = queue;
    ttq._t = ttq._t ?? {};
    ttq._t[pixelId] = Date.now();
    ttq._o = ttq._o ?? {};
    ttq._o[pixelId] = options ?? {};
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = `${src}?sdkid=${pixelId}&lib=${GLOBAL_NAME}`;
    const first = document.getElementsByTagName("script")[0];
    if (first?.parentNode) first.parentNode.insertBefore(script, first);
    else document.head.appendChild(script);
  };
  return ttq;
}

/** Calls a method on ttq, which queues it until the script has loaded. */
function call(ttq: Ttq, method: string, ...args: unknown[]): void {
  const fn = ttq[method];
  if (typeof fn === "function") (fn as (...a: unknown[]) => void).apply(ttq, args);
}

/**
 * Withdraws in the pixel when the choice no longer counts under the page's rules, also with no
 * TikTokPixel mounted. A pixel held after the last mount went away still caches page views, and a
 * later grant would send them. A withdrawal, or a choice that expires and is rechecked, revokes
 * here instead, so that queue is dropped.
 */
function onConsentChange(): void {
  const state = pageState();
  if (state && !state.revoked && !getConsent(state.options).marketing) stopTikTokPixel();
}

/**
 * Loads the pixel and starts it for `pixelId`. Call it only once the visitor has consented. The pixel
 * holds consent before it loads and is granted here. The first start, and the first after a stop,
 * sends a page view for the page it happens on. Returns a function that lets go of this start, such
 * as when the mount goes away, or undefined when the pixel already runs with another ID or other
 * rules. Once every start is let go, no event is sent.
 */
export function startTikTokPixel(pixelId: string, options: ConsentOptions = {}): (() => void) | undefined {
  if (conflictsWithPage(pixelId, options)) return undefined;
  const ttq = installTtq(window as TikTokWindow);
  if (!ttq) return undefined;
  // The store keeps its listeners in a set, so this adds the listener once for the page. Each start
  // adds it again, so it comes back if the store's listeners were cleared.
  subscribeConsent(onConsentChange);
  let state = states.get(ttq);
  if (!state) {
    const { noticeVersion, maxAgeDays } = options;
    state = { pixelId, options: { noticeVersion, maxAgeDays }, holders: 0, generation: 0, granted: false, revoked: false };
    states.set(ttq, state);
    // Consent mode: events wait in the pixel until consent is granted or revoked.
    call(ttq, "holdConsent");
    // No options in load and no user data from here. TikTok's automatic events and Automatic Advanced
    // Matching are switched on or off in TikTok Events Manager, not in code. The script turns on what
    // the server says, so the cookie page has to describe them, or the owner turns them off there.
    if (!ttq._i?.[pixelId]) ttq.load(pixelId);
  }
  // A held pixel cached page views since the hold. If the visitor chose again since then, such as
  // after the old choice expired unnoticed, those views fall outside this choice, so a revoke drops
  // them before the grant. A remount under the same choice keeps them.
  if (state.heldDecidedAt !== undefined && getStoredConsent().record?.decidedAt !== state.heldDecidedAt) {
    call(ttq, "revokeConsent");
  }
  state.heldDecidedAt = undefined;
  call(ttq, "grantConsent");
  const resumed = !state.granted;
  state.granted = true;
  state.revoked = false;
  state.holders++;
  // The pixel counts later client navigations itself, so only the page of a start is tracked here.
  if (resumed) send("page");
  const held = state;
  const generation = held.generation;
  let released = false;
  return () => {
    if (released || held.generation !== generation) return;
    released = true;
    held.holders--;
    // With no TikTokPixel left, hold consent in ttq, so its own history tracking waits too. It holds
    // rather than revokes, since consent still holds and a revoke sends TikTok a notice. The cookies
    // stay, and the next grant resumes. A microtask lets a StrictMode or same-commit remount start
    // again first.
    queueMicrotask(() => {
      if (held.holders > 0 || !held.granted) return;
      held.granted = false;
      held.heldDecidedAt = getStoredConsent().record?.decidedAt ?? "";
      call(ttq, "holdConsent");
    });
  };
}

/** The pixel's first-party cookies with a fixed name. Each `ttcsid_` cookie is found by its name. */
const COOKIE_NAMES = ["_ttp", "_tt_enable_cookie", "ttclid", "ttcsid"];

/** Removes the cookies the pixel sets on this site, on the host and each parent domain. */
export function clearTikTokPixelCookies(hostname: string = window.location.hostname): void {
  const labels = hostname.split(".");
  const domains = [""];
  for (let i = 0; i < labels.length - 1; i++) domains.push(`; domain=.${labels.slice(i).join(".")}`);
  const names = new Set(COOKIE_NAMES);
  for (const pair of document.cookie.split(";")) {
    const name = pair.split("=")[0]!.trim();
    if (name.startsWith("ttcsid_")) names.add(name);
  }
  for (const name of names) {
    for (const domain of domains) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
  }
}

/**
 * Removes the pixel's cookies, even those left from an earlier visit, and tells a loaded pixel that
 * consent is withdrawn. TikTok's script then sends one notice of the revoke, and nothing more is sent
 * until `startTikTokPixel`.
 */
export function stopTikTokPixel(): void {
  clearTikTokPixelCookies();
  const ttq = pageTtq();
  if (!ttq) return;
  const state = states.get(ttq);
  if (!state?.revoked) call(ttq, "revokeConsent");
  if (state) {
    state.revoked = true;
    state.granted = false;
    state.heldDecidedAt = undefined;
    state.holders = 0;
    state.generation++;
  }
}

/** Calls a pixel method if the pixel may send, and tells whether it did. */
function send(method: string, ...args: unknown[]): boolean {
  if (typeof window === "undefined") return false;
  const ttq = pageTtq();
  if (!ttq || typeof ttq[method] !== "function") return false;
  // The pixel this module started sends only while a TikTokPixel runs it, and checks the choice under
  // its own notice version and age, now, so an event stops the moment the choice expires. Another ttq
  // goes by the stored choice.
  const state = states.get(ttq);
  const consents = state ? state.holders > 0 && getConsent(state.options).marketing : getStoredConsent().marketing;
  if (!consents) return false;
  call(ttq, method, ...args);
  return true;
}

/** Options for `trackTikTok`. */
export interface TrackTikTokOptions {
  /** The ID TikTok uses to drop a duplicate of the event, such as an order reference. */
  eventId?: string | undefined;
}

/**
 * Sends an event to the TikTok Pixel. It does nothing on the server, before the pixel has loaded,
 * and without marketing consent, so it is safe to call anywhere. Event names are case-sensitive.
 * Returns true only when the event was handed to ttq, such as for recording that a Purchase went out.
 */
export function trackTikTok(event: string, params?: Record<string, unknown>, options?: TrackTikTokOptions): boolean {
  const args: unknown[] = [event];
  if (params || options?.eventId) args.push(params ?? {});
  if (options?.eventId) args.push({ event_id: options.eventId });
  return send("track", ...args);
}

/** What `identifyTikTok` takes. Pass the raw values, since the pixel hashes them in the browser. */
export interface TikTokIdentity {
  /** The visitor's email. It is trimmed and lowercased. */
  email?: string | undefined;
  /**
   * The visitor's phone number in E.164, such as `+4712345678`. Spaces, hyphens, dots and parentheses
   * are removed first. A number without a leading `+` is left out.
   */
  phoneNumber?: string | undefined;
  /** The app's own ID for the visitor. */
  externalId?: string | undefined;
}

/**
 * Sends the visitor's details for TikTok's Advanced Matching, for the events that follow. Call it
 * right before the event. It does nothing on the server, before the pixel has loaded, and without
 * marketing consent. A detail that is missing is sent as an empty string, as TikTok asks. Returns
 * true only when the details were handed to ttq.
 */
export function identifyTikTok(identity: TikTokIdentity): boolean {
  const phone = identity.phoneNumber?.replace(/[\s\-.()]/g, "") ?? "";
  return send("identify", {
    email: identity.email?.trim().toLowerCase() ?? "",
    phone_number: /^\+[1-9][0-9]{6,14}$/.test(phone) ? phone : "",
    external_id: identity.externalId?.trim() ?? "",
  });
}
