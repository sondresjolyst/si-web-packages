import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import { closeSessionPrompt, openSessionPrompt } from "../../session";
import { ProtectedGate } from "../../session/react";

const replace = vi.fn();
let pathname = "/admin/recipes/new";
let sessionState: { data: Session | null; status: "loading" | "authenticated" | "unauthenticated" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: (...args: unknown[]) => replace(...args) }),
  usePathname: () => pathname,
}));

vi.mock("next-auth/react", () => ({
  useSession: () => sessionState,
}));

const session = (error?: string): Session => ({
  user: { id: "1", name: "admin", email: "a@b.no", roles: ["Admin"] },
  accessToken: "token",
  error,
  expires: "",
});

const gate = () => (
  <ProtectedGate loginHref="/login" fallback={<p>Loading…</p>}>
    <p>admin work</p>
  </ProtectedGate>
);

describe("ProtectedGate", () => {
  beforeEach(() => {
    replace.mockClear();
    pathname = "/admin/recipes/new";
    sessionState = { data: null, status: "loading" };
    closeSessionPrompt();
  });

  afterEach(() => closeSessionPrompt());

  it("shows the fallback while the first session read is pending", () => {
    render(gate());

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("admin work")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders nothing while pending when no fallback is given", () => {
    const { container } = render(
      <ProtectedGate loginHref="/login">
        <p>admin work</p>
      </ProtectedGate>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("sends a signed-out visitor to the login page", () => {
    sessionState = { data: null, status: "unauthenticated" };
    render(gate());

    expect(replace).toHaveBeenCalledWith("/login");
    expect(screen.queryByText("admin work")).not.toBeInTheDocument();
  });

  it("renders the protected page for a healthy session", () => {
    sessionState = { data: session(), status: "authenticated" };
    render(gate());

    expect(screen.getByText("admin work")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("refuses to open the page on a session that is already dead", () => {
    sessionState = { data: session("RefreshTokenRejected"), status: "authenticated" };
    render(gate());

    // A form opened on a dead session lets the user type work they cannot save.
    expect(screen.queryByText("admin work")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("keeps the page mounted when the session dies while the user works", () => {
    sessionState = { data: session(), status: "authenticated" };
    const view = render(gate());

    sessionState = { data: session("AbsoluteSessionExpired"), status: "authenticated" };
    view.rerender(gate());

    expect(screen.getByText("admin work")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps the page mounted while the session is being re-read", () => {
    sessionState = { data: session(), status: "authenticated" };
    const view = render(gate());

    // next-auth reports 'loading' during a session refetch. Swapping the children for the
    // fallback here would unmount the form and lose everything typed into it.
    sessionState = { data: session(), status: "loading" };
    view.rerender(gate());

    expect(screen.getByText("admin work")).toBeInTheDocument();
  });

  it("checks a dead session again on the next protected page", () => {
    sessionState = { data: session(), status: "authenticated" };
    const view = render(gate());
    sessionState = { data: session("RefreshTokenRejected"), status: "authenticated" };
    view.rerender(gate());
    expect(replace).not.toHaveBeenCalled();

    pathname = "/admin/gear";
    view.rerender(gate());

    // A pass earned on the previous page must not carry into a fresh form.
    expect(replace).toHaveBeenCalledWith("/login");
    expect(screen.queryByText("admin work")).not.toBeInTheDocument();
  });

  it("does not redirect out from under the re-sign-in prompt", () => {
    sessionState = { data: null, status: "unauthenticated" };
    act(() => openSessionPrompt());

    render(gate());

    // The prompt recovers the session in place. Navigating away would unmount the form it is
    // trying to save.
    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps the form on screen while the prompt recovers a signed-out session", () => {
    sessionState = { data: session(), status: "authenticated" };
    const view = render(gate());

    // The cookie is gone and the prompt is open. Not redirecting is not enough, because blanking
    // the page would destroy the form too.
    sessionState = { data: null, status: "unauthenticated" };
    act(() => openSessionPrompt());
    view.rerender(gate());

    expect(screen.getByText("admin work")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("still blanks a page the user never got into, prompt or not", () => {
    sessionState = { data: null, status: "unauthenticated" };
    act(() => openSessionPrompt());

    render(gate());

    // Nothing was earned on this path, so there is no work to protect.
    expect(screen.queryByText("admin work")).not.toBeInTheDocument();
  });

  it("ignores a transient refresh failure", () => {
    sessionState = { data: session("ECONNREFUSED"), status: "authenticated" };
    render(gate());

    expect(screen.getByText("admin work")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
