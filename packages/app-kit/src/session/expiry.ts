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

/**
 * The codes a failed sign-in reports in next-auth's `error`. Wrong credentials and every API answer
 * look the same, so the message never hints that a password was right. Only an API that does not
 * answer, or a gateway error, reports `unavailable`. That depends on the server, never on the
 * password.
 */
export const SIGN_IN_ERRORS = {
  invalidCredentials: "InvalidCredentials",
  unavailable: "SignInUnavailable",
} as const;

/** One of the values in `SESSION_ERRORS`. */
export type SessionError = (typeof SESSION_ERRORS)[keyof typeof SESSION_ERRORS];

const TERMINAL: ReadonlySet<string> = new Set(Object.values(SESSION_ERRORS));

/** Whether a session error means the user has to sign in again. */
export function isTerminalSessionError(error: string | undefined): boolean {
  return error != null && TERMINAL.has(error);
}

// Whether the re-sign-in prompt is showing. It lives outside React for two reasons:
// 1. The axios interceptor that raises it is a plain module.
// 2. The page gate reads it, so it never redirects to login while the prompt recovers the session.
//
// It sits on globalThis under a registered symbol, so two copies of this module share one prompt.
// Two installed versions of the package are one example. A gate reading one copy then sees a
// prompt raised through the other and keeps the form on screen.
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
