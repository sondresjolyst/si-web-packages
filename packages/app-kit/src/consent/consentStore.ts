// The visitor's consent to marketing tools. It lives outside React, so a plain module such as
// trackPixel can read it, and every component on the page sees the same choice.
//
// The choice is kept in localStorage, not in a cookie. Nothing in it is needed on the server, and a
// cookie would go to the server with every request. The state sits on globalThis under a registered
// symbol, so two copies of this module share one choice.

/** The localStorage key that holds the choice. */
export const CONSENT_STORAGE_KEY = "consent";

/** The version of the stored record. A record of another version counts as no choice. */
export const CONSENT_VERSION = 1;

/** The choice as it is stored. */
export interface ConsentRecord {
  /** Whether the visitor accepted marketing and ad measurement. */
  marketing: boolean;
  version: number;
  /** When the visitor chose, as an ISO 8601 timestamp. */
  decidedAt: string;
}

/** What `useConsent` returns. */
export interface ConsentState {
  /** Whether storage has been read. It is false on the server and while the page hydrates. */
  ready: boolean;
  /** The stored choice. It is null when there is none, or when storage cannot be read. */
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
  return typeof r.marketing === "boolean" && r.version === CONSENT_VERSION && typeof r.decidedAt === "string";
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
  return isRecord(parsed) ? { marketing: parsed.marketing, version: parsed.version, decidedAt: parsed.decidedAt } : null;
}

function stateOf(record: ConsentRecord | null, reopened: boolean): ConsentState {
  return { ready: true, record, marketing: record?.marketing === true, reopened };
}

function update(next: ConsentState): void {
  store.state = next;
  for (const listener of [...store.listeners]) listener();
}

/** Gives the current choice. On the server it is never ready and never consents. */
export function getConsent(): ConsentState {
  if (typeof window === "undefined") return SERVER_STATE;
  return (store.state ??= stateOf(readRecord(), false));
}

/** Gives the state the server renders with, before storage is read. */
export function getServerConsent(): ConsentState {
  return SERVER_STATE;
}

/** Rereads storage after another tab changed the choice. */
function onStorage(event: StorageEvent): void {
  if (event.key !== CONSENT_STORAGE_KEY && event.key !== null) return;
  update(stateOf(readRecord(), getConsent().reopened));
}

/** Subscribes to the choice changing, here or in another tab. Returns a function that unsubscribes. */
export function subscribeConsent(listener: () => void): () => void {
  if (store.listeners.size === 0) window.addEventListener("storage", onStorage);
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
    if (store.listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/**
 * Stores the visitor's choice and closes the banner. If storage cannot be written, the choice holds
 * for this page until it reloads, and the banner asks again on the next visit.
 */
export function setConsent(choice: { marketing: boolean }): void {
  const record: ConsentRecord = { marketing: choice.marketing, version: CONSENT_VERSION, decidedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage is full or blocked. The choice still holds in memory.
  }
  update(stateOf(record, false));
}

/** Shows the banner again, so the visitor can change the choice. */
export function openConsentSettings(): void {
  const current = getConsent();
  if (current.reopened) return;
  update(stateOf(current.record, true));
}

/** Forgets the state read from storage. For tests. */
export function resetConsentStore(): void {
  store.state = null;
  store.listeners.clear();
  window.removeEventListener("storage", onStorage);
}
