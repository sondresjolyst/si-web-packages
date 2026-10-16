import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Session } from "next-auth";
import { AdminShell } from "../../admin";

const replace = vi.fn();
let pathname = "/no/admin/users";
let sessionState: { data: Session | null; status: "loading" | "authenticated" | "unauthenticated" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: (...args: unknown[]) => replace(...args) }),
  usePathname: () => pathname,
}));

vi.mock("next-auth/react", () => ({
  useSession: () => sessionState,
}));

const session = (roles: string[]): Session => ({
  user: { id: "1", name: "admin", email: "a@b.no", roles },
  accessToken: "token",
  expires: "",
});

const tabs = [
  { href: "/no/admin/users", label: "Brukere" },
  { href: "/no/admin/legal", label: "Juridisk" },
];

describe("AdminShell", () => {
  beforeEach(() => {
    replace.mockClear();
    pathname = "/no/admin/users";
    sessionState = { data: session(["Admin"]), status: "authenticated" };
  });

  it("shows the title, the tabs and the page for an admin", () => {
    render(
      <AdminShell role="Admin" title="Admin" tabs={tabs} denied={<p>No access</p>}>
        <p>users page</p>
      </AdminShell>,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Admin");
    expect(screen.getByRole("link", { name: "Brukere" })).toHaveAttribute("href", "/no/admin/users");
    expect(screen.getByRole("link", { name: "Juridisk" })).toHaveAttribute("href", "/no/admin/legal");
    expect(screen.getByText("users page")).toBeInTheDocument();
  });

  it("marks only the tab for the current path as active", () => {
    pathname = "/no/admin/legal";
    render(
      <AdminShell role="Admin" title="Admin" tabs={tabs} denied={<p>No access</p>}>
        <p>legal page</p>
      </AdminShell>,
    );

    const legal = screen.getByRole("link", { name: "Juridisk" });
    const users = screen.getByRole("link", { name: "Brukere" });
    expect(legal).toHaveAttribute("aria-current", "page");
    expect(legal).toHaveClass("border-admin-tab-indicator", "text-admin-tab-active");
    expect(users).not.toHaveAttribute("aria-current");
    expect(users).toHaveClass("border-transparent", "text-admin-tab");
  });

  it("marks no tab on a page below a tab", () => {
    pathname = "/no/admin/users/u1";
    render(
      <AdminShell role="Admin" title="Admin" tabs={tabs} denied={<p>No access</p>}>
        <p>user page</p>
      </AdminShell>,
    );

    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
  });

  it("shows the denied block instead of the frame to a user without the role", () => {
    sessionState = { data: session([]), status: "authenticated" };
    render(
      <AdminShell role="Admin" title="Admin" tabs={tabs} denied={<p>No access</p>}>
        <p>users page</p>
      </AdminShell>,
    );

    expect(screen.getByText("No access")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByText("users page")).not.toBeInTheDocument();
  });

  it("sends a user without the role to deniedHref", () => {
    sessionState = { data: session([]), status: "authenticated" };
    render(
      <AdminShell role="Admin" title="Admin" tabs={tabs} deniedHref="/no" fallback={<p>Checking…</p>}>
        <p>users page</p>
      </AdminShell>,
    );

    expect(replace).toHaveBeenCalledWith("/no");
    expect(screen.queryByText("users page")).not.toBeInTheDocument();
  });

  it("shows the fallback while the session loads", () => {
    sessionState = { data: null, status: "loading" };
    render(
      <AdminShell role="Admin" title="Admin" tabs={tabs} denied={<p>No access</p>} fallback={<p>Checking…</p>}>
        <p>users page</p>
      </AdminShell>,
    );

    expect(screen.getByText("Checking…")).toBeInTheDocument();
    expect(screen.queryByText("users page")).not.toBeInTheDocument();
  });
});
