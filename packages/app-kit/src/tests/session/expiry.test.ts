import { describe, it, expect, afterEach, vi } from "vitest";
import {
  SESSION_ERRORS,
  closeSessionPrompt,
  getSessionPromptOpen,
  isTerminalSessionError,
  openSessionPrompt,
  subscribeSessionPrompt,
} from "../../session";

const unsubscribes: (() => void)[] = [];
const subscribe = (listener: () => void) => {
  const unsubscribe = subscribeSessionPrompt(listener);
  unsubscribes.push(unsubscribe);
  return unsubscribe;
};

afterEach(() => {
  closeSessionPrompt();
  for (const unsubscribe of unsubscribes.splice(0)) unsubscribe();
});

describe("session expiry classification", () => {
  it("keeps the values the jwt callback writes into session cookies", () => {
    // Existing session cookies carry these strings. Changing one turns a dead session into a
    // usable one for every user who holds such a cookie.
    expect(SESSION_ERRORS).toEqual({
      absoluteExpiry: "AbsoluteSessionExpired",
      refreshRejected: "RefreshTokenRejected",
      noRefreshToken: "NoRefreshToken",
    });
  });

  it("treats every error the jwt callback can set as terminal", () => {
    for (const error of Object.values(SESSION_ERRORS)) {
      expect(isTerminalSessionError(error)).toBe(true);
    }
  });

  it("does not treat a healthy or transiently failing session as terminal", () => {
    expect(isTerminalSessionError(undefined)).toBe(false);
    expect(isTerminalSessionError("ECONNREFUSED")).toBe(false);
    expect(isTerminalSessionError("Request failed with status code 500")).toBe(false);
  });
});

describe("the re-sign-in prompt", () => {
  it("tells every subscriber when it opens and closes", () => {
    const first = vi.fn();
    const second = vi.fn();
    subscribe(first);
    const unsubscribe = subscribe(second);

    openSessionPrompt();
    expect(getSessionPromptOpen()).toBe(true);
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();

    unsubscribe();
    closeSessionPrompt();
    expect(getSessionPromptOpen()).toBe(false);
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledOnce();
  });

  it("does not fire again while it is already open", () => {
    const listener = vi.fn();
    subscribe(listener);

    openSessionPrompt();
    openSessionPrompt();

    expect(listener).toHaveBeenCalledOnce();
  });

  it("lets a subscriber unsubscribe from inside its own callback", () => {
    const later = vi.fn();
    const unsubscribe = subscribe(() => unsubscribe());
    subscribe(later);

    expect(() => openSessionPrompt()).not.toThrow();
    expect(later).toHaveBeenCalledOnce();
  });

  it("is shared with a second copy of the module", async () => {
    vi.resetModules();
    const copy = await import("../../session/expiry");
    const listener = vi.fn();
    subscribe(listener);

    // Two installed versions of the package must agree on whether the prompt is open. A gate
    // reading one copy must see a prompt raised through the other.
    copy.openSessionPrompt();

    expect(getSessionPromptOpen()).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
  });
});
