import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { Session } from "next-auth";
import { closeSessionPrompt, openSessionPrompt } from "../../session";
import { useSessionGate } from "../../session/react";

let pathname = "/admin/recipes/new";
let sessionState: { data: Session | null; status: "loading" | "authenticated" | "unauthenticated" };

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("next-auth/react", () => ({
  useSession: () => sessionState,
}));

const session = (error?: string): Session =>
  ({ user: { name: "admin" }, expires: "", error }) as Session;

const gate = () => renderHook(() => useSessionGate());

describe("useSessionGate", () => {
  beforeEach(() => {
    pathname = "/admin/recipes/new";
    sessionState = { data: null, status: "loading" };
    closeSessionPrompt();
  });

  afterEach(() => closeSessionPrompt());

  it("holds the page back while the first session read is pending", () => {
    expect(gate().result.current.mayRender).toBe(false);
  });

  it("holds the page back from a signed-out visitor", () => {
    sessionState = { data: null, status: "unauthenticated" };

    expect(gate().result.current.mayRender).toBe(false);
  });

  it("renders the page for a healthy session", () => {
    sessionState = { data: session(), status: "authenticated" };
    const { result } = gate();

    expect(result.current.usable).toBe(true);
    expect(result.current.mayRender).toBe(true);
  });

  it("refuses to open the page on a session that is already dead", () => {
    sessionState = { data: session("RefreshTokenRejected"), status: "authenticated" };
    const { result } = gate();

    expect(result.current.usable).toBe(false);
    expect(result.current.mayRender).toBe(false);
  });

  it("keeps the page when the session dies while the user works", () => {
    sessionState = { data: session(), status: "authenticated" };
    const { result, rerender } = gate();

    sessionState = { data: session("AbsoluteSessionExpired"), status: "authenticated" };
    rerender();

    expect(result.current.usable).toBe(false);
    expect(result.current.wasUsable).toBe(true);
    expect(result.current.mayRender).toBe(true);
  });

  it("keeps the page while the session is being re-read", () => {
    sessionState = { data: session(), status: "authenticated" };
    const { result, rerender } = gate();

    // next-auth reports 'loading' during a refetch. The page stays, so the form keeps what the
    // user typed.
    sessionState = { data: session(), status: "loading" };
    rerender();

    expect(result.current.mayRender).toBe(true);
  });

  it("checks a dead session again on the next page", () => {
    sessionState = { data: session(), status: "authenticated" };
    const { result, rerender } = gate();
    sessionState = { data: session("RefreshTokenRejected"), status: "authenticated" };
    rerender();
    expect(result.current.mayRender).toBe(true);

    pathname = "/admin/gear";
    rerender();

    // A pass earned on the previous page must not carry into a fresh form.
    expect(result.current.wasUsable).toBe(false);
    expect(result.current.mayRender).toBe(false);
  });

  it("keeps the next page when the session dies there", () => {
    sessionState = { data: session(), status: "authenticated" };
    const { result, rerender } = gate();

    pathname = "/admin/gear";
    rerender();
    sessionState = { data: session("AbsoluteSessionExpired"), status: "authenticated" };
    rerender();

    // The healthy session on this page earned it the same protection as the first one.
    expect(result.current.wasUsable).toBe(true);
    expect(result.current.mayRender).toBe(true);
  });

  it("keeps the page while the prompt recovers a signed-out session", () => {
    sessionState = { data: session(), status: "authenticated" };
    const { result, rerender } = gate();

    sessionState = { data: null, status: "unauthenticated" };
    act(() => openSessionPrompt());
    rerender();

    expect(result.current.promptOpen).toBe(true);
    expect(result.current.recovering).toBe(true);
    expect(result.current.mayRender).toBe(true);
  });

  it("still holds back a page the user never got into, prompt or not", () => {
    sessionState = { data: null, status: "unauthenticated" };
    act(() => openSessionPrompt());
    const { result } = gate();

    // Nothing was earned on this path, so there is no work to protect.
    expect(result.current.recovering).toBe(false);
    expect(result.current.mayRender).toBe(false);
  });

  it("follows the prompt as it opens and closes", () => {
    sessionState = { data: session(), status: "authenticated" };
    const { result } = gate();

    act(() => openSessionPrompt());
    expect(result.current.promptOpen).toBe(true);

    act(() => closeSessionPrompt());
    expect(result.current.promptOpen).toBe(false);
  });

  it("ignores a transient refresh failure", () => {
    sessionState = { data: session("ECONNREFUSED"), status: "authenticated" };

    expect(gate().result.current.mayRender).toBe(true);
  });

  it("sees a prompt raised through another copy of the package", async () => {
    vi.resetModules();
    const copy = await import("../../session/expiry");
    sessionState = { data: session(), status: "authenticated" };
    const { result, rerender } = gate();

    sessionState = { data: null, status: "unauthenticated" };
    act(() => copy.openSessionPrompt());
    rerender();

    expect(result.current.recovering).toBe(true);
    expect(result.current.mayRender).toBe(true);
    act(() => copy.closeSessionPrompt());
  });

  it("does not count a page as passed when the router reports no path", () => {
    pathname = null as unknown as string;
    sessionState = { data: session("RefreshTokenRejected"), status: "authenticated" };
    const { result } = gate();

    // usePathname can return null. That must not match the empty starting state.
    expect(result.current.wasUsable).toBe(false);
    expect(result.current.mayRender).toBe(false);
  });
});
