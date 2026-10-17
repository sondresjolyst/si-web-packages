// Test doubles for the modules every app's tests mock. Import them inside the vi.mock factory, which
// vitest hoists above the file's own imports:
//
//   vi.mock("next-auth/react", async () => (await import("@sjolystinnovation/app-kit/testing")).nextAuthMock());
//
// The test then imports the same module instance to set the state and read the spies, and calls
// resetTestMocks before each test, since the state lives for the whole file.
import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { vi } from "vitest";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

/** What `useSession` returns, and the next-auth calls as spies. `update` is the one `useSession` returns. */
export const auth = {
  state: { data: null, status: "unauthenticated" } as { data: Session | null; status: SessionStatus },
  signIn: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  update: vi.fn(),
};

/** Builds a signed-in session with `roles`. Defaults to an admin. */
export function makeSession({ roles = ["Admin"], ...overrides }: Partial<Session> & { roles?: string[] } = {}): Session {
  return {
    user: { id: "1", name: "admin", email: "a@b.no", roles },
    accessToken: "token",
    expires: "",
    ...overrides,
  };
}

/** Signs in with `session`, signs out with null, or leaves the session loading. */
export function setSession(session: Session | null | "loading"): void {
  auth.state =
    session === "loading"
      ? { data: null, status: "loading" }
      : session === null
        ? { data: null, status: "unauthenticated" }
        : { data: session, status: "authenticated" };
}

/** Builds the `next-auth/react` module, reading `auth`. */
export function nextAuthMock() {
  return {
    useSession: () => ({ ...auth.state, update: (...args: unknown[]) => auth.update(...args) }),
    signIn: (...args: unknown[]) => auth.signIn(...args),
    signOut: (...args: unknown[]) => auth.signOut(...args),
    getSession: (...args: unknown[]) => auth.getSession(...args),
    SessionProvider: ({ children }: { children?: ReactNode }) => children,
  };
}

/** The current URL and the router's calls as spies. */
export const navigation = {
  pathname: "/",
  searchParams: new URLSearchParams(),
  router: { push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() },
};

/** Builds the `next/navigation` hooks, reading `navigation`. */
export function nextNavigationMock() {
  return {
    useRouter: () => navigation.router,
    usePathname: () => navigation.pathname,
    useSearchParams: () => navigation.searchParams,
  };
}

/** The toast calls as spies. */
export const toastSpies = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  message: vi.fn(),
  loading: vi.fn(),
  promise: vi.fn(),
  dismiss: vi.fn(),
};

/** Builds the `sonner` module, or `@sjolystinnovation/app-kit/toast`. A bare `toast(text)` goes to `toastSpies.message`. */
export function toastMock() {
  const toast = Object.assign((...args: unknown[]) => toastSpies.message(...args), {
    success: (...args: unknown[]) => toastSpies.success(...args),
    error: (...args: unknown[]) => toastSpies.error(...args),
    info: (...args: unknown[]) => toastSpies.info(...args),
    warning: (...args: unknown[]) => toastSpies.warning(...args),
    message: (...args: unknown[]) => toastSpies.message(...args),
    loading: (...args: unknown[]) => toastSpies.loading(...args),
    promise: (...args: unknown[]) => toastSpies.promise(...args),
    dismiss: (...args: unknown[]) => toastSpies.dismiss(...args),
  });
  return { toast, Toaster: () => null };
}

/** Signs out, goes back to `/`, and clears every spy's calls and answers. */
export function resetTestMocks(): void {
  setSession(null);
  navigation.pathname = "/";
  navigation.searchParams = new URLSearchParams();
  for (const spy of [auth.signIn, auth.signOut, auth.getSession, auth.update, ...Object.values(navigation.router), ...Object.values(toastSpies)]) {
    spy.mockReset();
  }
}
