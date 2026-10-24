// The visitor's consent to marketing tools. It lives outside React, so a plain module such as
// trackPixel can read it, and every component on the page sees the same choice.
//
// The choice is kept in localStorage, not in a cookie. Nothing in it is needed on the server, and a
// cookie would go to the server with every request. The state sits on globalThis under a registered
// symbol, so two copies of this module share one choice.

import { isValidNoticeVersion, logConsent, type ConsentLogOptions } from "./consentLog";

/** The localStorage key that holds the choice. */
export const CONSENT_STORAGE_KEY = "consent";

/**
 * The version of the stored record's shape. A record of another version counts as no choice. The
 * version of the notice the visitor agreed to is `noticeVersion`, which the app sets.
 */
export const CONSENT_VERSION = 1;

/** How many days a choice holds before the banner asks again, unless the app sets `maxAgeDays`. */
export const DEFAULT_CONSENT_MAX_AGE_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The rules a stored choice must meet to count. Pass the same ones to `ConsentBanner` and `MetaPixel`. */
export interface ConsentOptions {
  /** The version of the notice the visitor agrees to. A choice made for another one counts as no choice. */
  noticeVersion?: string | undefined;
  /** How many days a choice holds. Defaults to 365. An older choice counts as no choice. */
  maxAgeDays?: number | undefined;
}

/** The choice as it is stored. */
export interface ConsentRecord {
  /**
   * A random ID for this browser's choices, made on the first choice and kept for later ones. It is
   * not derived from anything about the visitor. The consent log uses it to show what was chosen.
   */
  consentId: string;
  /** Whether the visitor accepted marketing and ad measurement. */
  marketing: boolean;
  version: number;
  /** When the visitor chose, as an ISO 8601 timestamp. */
  decidedAt: string;
  /** The app's `noticeVersion` when the visitor chose, if it set one. */
  noticeVersion?: string;
}

/** What `useConsent` returns. */
export interface ConsentState {
  /** Whether storage has been read. It is false on the server and while the page hydrates. */
  ready: boolean;
  /**
   * The stored choice. It is null when there is none, when storage cannot be read, or when it was
   * made for another notice version.
   */
  record: ConsentRecord | null;
  /** Whether the visitor accepted marketing. It is false until `ready`, and without a choice. */
  marketing: boolean;
  /** Whether the visitor reopened the choice through `openConsentSettings`. */
  reopened: boolean;
}

interface Store {
  /** The state, read from storage on first use in the browser. */
  state: ConsentState | null;
  listeners: Set<() => void>;
  /** Whether the page listens for other tabs, focus, and visibility. It does for the page's lifetime. */
  watching?: boolean;
  /** A choice storage would not take, kept for the rest of the page. */
  unsaved?: ConsentRecord | null;
}

// The shape of Store is a contract between releases. A release that changes it must also change
// this key, so it never reads state in a shape it does not expect.
const STATE_KEY = Symbol.for("@sjolystinnovation/app-kit/consent/v1");
const shared = globalThis as typeof globalThis & { [STATE_KEY]?: Store };
const store: Store = (shared[STATE_KEY] ??= { state: null, listeners: new Set() });

const SERVER_STATE: ConsentState = { ready: false, record: null, marketing: false, reopened: false };

function isRecord(value: unknown): value is ConsentRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.consentId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.consentId) &&
    !/^[0-]+$/.test(r.consentId) &&
    typeof r.marketing === "boolean" &&
    r.version === CONSENT_VERSION &&
    typeof r.decidedAt === "string" &&
    (r.noticeVersion === undefined || typeof r.noticeVersion === "string")
  );
}

/** Reads the stored choice. Storage that throws, or a record it cannot use, gives no choice. */
function readRecord(): ConsentRecord | null {
  let parsed: unknown;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw == null) return null;
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const { consentId, marketing, version, decidedAt, noticeVersion } = parsed;
  return { consentId, marketing, version, decidedAt, ...(noticeVersion !== undefined && { noticeVersion }) };
}

function stateOf(record: ConsentRecord | null, reopened: boolean): ConsentState {
  return { ready: true, record, marketing: record?.marketing === true, reopened };
}

function update(next: ConsentState): void {
  store.state = next;
  for (const listener of [...store.listeners]) listener();
}

/**
 * Reads storage again and tells every subscriber, so a choice that has grown too old in an open tab,
 * or one another tab made, applies at once. MetaPixel calls it on each navigation.
 */
export function recheckConsent(): void {
  if (typeof window === "undefined") return;
  update(stateOf(readRecord() ?? store.unsaved ?? null, store.state?.reopened ?? false));
}

function onStorage(event: StorageEvent): void {
  if (event.key === CONSENT_STORAGE_KEY || event.key === null) recheckConsent();
}

function onVisibility(): void {
  if (document.visibilityState === "visible") recheckConsent();
}

/** Listens for the rest of the page, so the choice stays current with or without a subscriber. */
function watch(): void {
  if (store.watching) return;
  store.watching = true;
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", recheckConsent);
  document.addEventListener("visibilitychange", onVisibility);
}

/** Gives the stored choice, whatever notice it was made for. useConsent reads it as its snapshot. */
export function getStoredConsent(): ConsentState {
  if (typeof window === "undefined") return SERVER_STATE;
  watch();
  return (store.state ??= stateOf(readRecord(), false));
}

/** Checks that a choice was made for this notice and is not older than `maxAgeDays`. */
function counts(record: ConsentRecord, { noticeVersion, maxAgeDays = DEFAULT_CONSENT_MAX_AGE_DAYS }: ConsentOptions): boolean {
  if (record.noticeVersion !== noticeVersion) return false;
  const age = Date.now() - Date.parse(record.decidedAt);
  return age <= maxAgeDays * DAY_MS;
}

/** Treats a choice made for another notice version, or one that is too old, as no choice. */
export function applyConsentOptions(state: ConsentState, options: ConsentOptions = {}): ConsentState {
  if (!state.record || counts(state.record, options)) return state;
  return { ...state, record: null, marketing: false };
}

/**
 * Gives the current choice under `options`, outside React. On the server it is never ready and never
 * consents.
 */
export function getConsent(options?: ConsentOptions): ConsentState {
  return applyConsentOptions(getStoredConsent(), options);
}

/** Gives the state the server renders with, before storage is read. */
export function getServerConsent(): ConsentState {
  return SERVER_STATE;
}

/** Subscribes to the choice changing, here or in another tab. Returns a function that unsubscribes. */
export function subscribeConsent(listener: () => void): () => void {
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
}

/** Throws in development for a notice version the consent log would refuse, so the app notices. */
export function assertNoticeVersion(noticeVersion: string | undefined): void {
  if (noticeVersion === undefined || isValidNoticeVersion(noticeVersion) || process.env.NODE_ENV === "production") return;
  throw new Error(`noticeVersion "${noticeVersion}" is invalid. Use 1 to 64 of A-Z, a-z, 0-9, dot, underscore and hyphen.`);
}

/** What `setConsent` takes. */
export interface ConsentChoice {
  marketing: boolean;
  /** The notice version the choice is made for. */
  noticeVersion?: string | undefined;
  /** Posts the choice to the consent log as well, without waiting for it. */
  log?: ConsentLogOptions | undefined;
}

/** A random version 4 UUID. getRandomValues also works where randomUUID does not, outside HTTPS. */
function newConsentId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = [...b].map(x => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Stores the visitor's choice, closes the banner, posts it to `choice.log` if given, and returns the
 * stored record. It keeps the browser's `consentId` from an earlier choice, also one another tab
 * made. If storage cannot be written, the choice holds for this page until it reloads, and the banner
 * asks again on the next visit. For a custom banner only, and only from the visitor's own action.
 */
export function setConsent(choice: ConsentChoice): ConsentRecord {
  assertNoticeVersion(choice.noticeVersion);
  const record: ConsentRecord = {
    consentId: readRecord()?.consentId ?? getStoredConsent().record?.consentId ?? newConsentId(),
    marketing: choice.marketing,
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    ...(choice.noticeVersion !== undefined && { noticeVersion: choice.noticeVersion }),
  };
  store.unsaved = null;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage is full or blocked. The choice still holds in memory.
    store.unsaved = record;
  }
  update(stateOf(record, false));
  if (choice.log) void logConsent(record, choice.log);
  return record;
}

/** Shows the banner again, so the visitor can change the choice. */
export function openConsentSettings(): void {
  const current = getStoredConsent();
  if (current.reopened) return;
  update(stateOf(current.record, true));
}

/** Hides a reopened banner and keeps the choice as it was. */
export function closeConsentSettings(): void {
  const current = getStoredConsent();
  if (!current.reopened) return;
  update(stateOf(current.record, false));
}

/** Forgets the state read from storage. For tests. */
export function resetConsentStore(): void {
  store.state = null;
  store.unsaved = null;
  store.listeners.clear();
}
