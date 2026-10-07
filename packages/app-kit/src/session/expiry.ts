/**
 * Errors the jwt callback sets when the session cannot be recovered without a new sign-in. A
 * transient refresh failure, such as a network error or an API restart, sets no error, so the
 * session keeps working and a later session read retries the refresh.
 */
export const SESSION_ERRORS = {
  absoluteExpiry: "AbsoluteSessionExpired",
  refreshRejected: "RefreshTokenRejected",
  noRefreshToken: "NoRefreshToken",
} as const;

/** One of the values in `SESSION_ERRORS`. */
export type SessionError = (typeof SESSION_ERRORS)[keyof typeof SESSION_ERRORS];

const TERMINAL: ReadonlySet<string> = new Set(Object.values(SESSION_ERRORS));

/** Whether a session error means the user has to sign in again. */
export function isTerminalSessionError(error: string | undefined): boolean {
  return error != null && TERMINAL.has(error);
}

// Whether the re-sign-in prompt is showing. It lives outside React because the axios interceptor
// that raises it is a plain module, and because the page gate has to know: it must not redirect to
// the login page while the prompt is recovering the session in place.
//
// Kept on globalThis under a registered symbol, so two copies of this module, such as two installed
// versions of the package, still share one prompt. Separate state would let a prompt raised through
// one copy go unseen by a gate reading the other, and the gate would redirect away from the form.
interface PromptState {
  open: boolean;
  listeners: Set<() => void>;
}

// The shape of PromptState is a contract between releases. A release that changes it must also
// change this key, so it never reads state in a shape it does not expect.
const STATE_KEY = Symbol.for("@sjolystinnovation/app-kit/session-prompt/v1");
const shared = globalThis as typeof globalThis & { [STATE_KEY]?: PromptState };
const state: PromptState = (shared[STATE_KEY] ??= { open: false, listeners: new Set() });

function emit(): void {
  for (const listener of [...state.listeners]) listener();
}

/** Ask the user to sign in again without leaving the page. */
export function openSessionPrompt(): void {
  if (state.open) return;
  state.open = true;
  emit();
}

export function closeSessionPrompt(): void {
  if (!state.open) return;
  state.open = false;
  emit();
}

export function subscribeSessionPrompt(listener: () => void): () => void {
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
}

export function getSessionPromptOpen(): boolean {
  return state.open;
}
