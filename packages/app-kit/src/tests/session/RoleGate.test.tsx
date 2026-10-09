import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import { closeSessionPrompt, openSessionPrompt } from "../../session";
import { ProtectedGate, RoleGate } from "../../session/react";

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

const session = (roles: string[] = ["Admin"]): Session => ({
  user: { id: "1", name: "admin", email: "a@b.no", roles },
  accessToken: "token",
  expires: "",
});

// The real nesting: ProtectedGate decides whether the session may render, RoleGate checks the role.
const tree = () => (
  <ProtectedGate loginHref="/login" fallback={<p>Loading…</p>}>
    <RoleGate role="Admin" fallback={<p>Checking…</p>} denied={<p>No access</p>}>
      <p>admin work</p>
    </RoleGate>
  </ProtectedGate>
);

const treeWithHref = () => (
  <ProtectedGate loginHref="/login" fallback={<p>Loading…</p>}>
    <RoleGate role="Admin" fallback={<p>Checking…</p>} deniedHref="/">
      <p>admin work</p>
    </RoleGate>
  </ProtectedGate>
);

describe("RoleGate", () => {
  beforeEach(() => {
    replace.mockClear();
    pathname = "/admin/recipes/new";
    sessionState = { data: session(), status: "authenticated" };
    closeSessionPrompt();
  });

  afterEach(() => closeSessionPrompt());

  it("renders the page for a session with the role", () => {
    render(tree());

    expect(screen.getByText("admin work")).toBeInTheDocument();
  });

  it("keeps the page on screen while the prompt recovers a signed-out session", () => {
    const view = render(tree());

    // The cookie is gone and a failed request opened the prompt. There is no user, so no roles.
    sessionState = { data: null, status: "unauthenticated" };
    act(() => openSessionPrompt());
    view.rerender(tree());

    expect(screen.getByText("admin work")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows denied to a signed-in user without the role", () => {
    sessionState = { data: session([]), status: "authenticated" };
    render(tree());

    expect(screen.queryByText("admin work")).not.toBeInTheDocument();
    expect(screen.getByText("No access")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps a user without the role out while the prompt is open", () => {
    sessionState = { data: session([]), status: "authenticated" };
    const view = render(tree());

    act(() => openSessionPrompt());
    view.rerender(tree());

    expect(screen.queryByText("admin work")).not.toBeInTheDocument();
    expect(screen.getByText("No access")).toBeInTheDocument();
  });

  it("drops the pass when the session gets a user without the role", () => {
    const view = render(tree());

    // Another account signed in through the prompt, or the role was taken away.
    sessionState = { data: session([]), status: "authenticated" };
    act(() => openSessionPrompt());
    view.rerender(tree());
    expect(screen.queryByText("admin work")).not.toBeInTheDocument();

    // The pass stays cleared after that session is lost too.
    sessionState = { data: null, status: "unauthenticated" };
    view.rerender(tree());
    expect(screen.queryByText("admin work")).not.toBeInTheDocument();
  });

  it("keeps out a user without the role whose session is lost while the prompt is open", () => {
    sessionState = { data: session([]), status: "authenticated" };
    const view = render(tree());

    sessionState = { data: null, status: "unauthenticated" };
    act(() => openSessionPrompt());
    view.rerender(tree());

    expect(screen.queryByText("admin work")).not.toBeInTheDocument();
  });

  it("does not carry a pass from one page to the next", () => {
    const view = render(tree());

    // The next page has a working session without a user, so the role is never seen there.
    pathname = "/admin/users";
    sessionState = { data: { accessToken: "token", expires: "" } as Session, status: "authenticated" };
    view.rerender(tree());
    act(() => openSessionPrompt());
    view.rerender(tree());

    expect(screen.queryByText("admin work")).not.toBeInTheDocument();
  });

  it("shows the fallback while the session has no user and the role was never seen", () => {
    sessionState = { data: { accessToken: "token", expires: "" } as Session, status: "authenticated" };
    render(tree());

    expect(screen.getByText("Checking…")).toBeInTheDocument();
    expect(screen.queryByText("No access")).not.toBeInTheDocument();
  });

  it("sends a user without the role to deniedHref", () => {
    sessionState = { data: session([]), status: "authenticated" };
    render(treeWithHref());

    expect(replace).toHaveBeenCalledWith("/");
    expect(screen.getByText("Checking…")).toBeInTheDocument();
    expect(screen.queryByText("admin work")).not.toBeInTheDocument();
  });

  it("does not leave for deniedHref while the prompt recovers a page that had the role", () => {
    const view = render(treeWithHref());

    sessionState = { data: null, status: "unauthenticated" };
    act(() => openSessionPrompt());
    view.rerender(treeWithHref());

    expect(screen.getByText("admin work")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
