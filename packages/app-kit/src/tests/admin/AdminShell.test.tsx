import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminShell } from "../../admin";
import { makeSession, navigation, resetTestMocks, setSession } from "../../testing";

vi.mock("next/navigation", async () => (await import("../../testing")).nextNavigationMock());
vi.mock("next-auth/react", async () => (await import("../../testing")).nextAuthMock());

const tabs = [
  { href: "/no/admin/users", label: "Brukere" },
  { href: "/no/admin/legal", label: "Juridisk" },
];

describe("AdminShell", () => {
  beforeEach(() => {
    resetTestMocks();
    navigation.pathname = "/no/admin/users";
    setSession(makeSession());
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
    navigation.pathname = "/no/admin/legal";
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
    navigation.pathname = "/no/admin/users/u1";
    render(
      <AdminShell role="Admin" title="Admin" tabs={tabs} denied={<p>No access</p>}>
        <p>user page</p>
      </AdminShell>,
    );

    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
  });

  it("shows the denied block instead of the frame to a user without the role", () => {
    setSession(makeSession({ roles: [] }));
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
    setSession(makeSession({ roles: [] }));
    render(
      <AdminShell role="Admin" title="Admin" tabs={tabs} deniedHref="/no" fallback={<p>Checking…</p>}>
        <p>users page</p>
      </AdminShell>,
    );

    expect(navigation.router.replace).toHaveBeenCalledWith("/no");
    expect(screen.queryByText("users page")).not.toBeInTheDocument();
  });

  it("shows the fallback while the session loads", () => {
    setSession("loading");
    render(
      <AdminShell role="Admin" title="Admin" tabs={tabs} denied={<p>No access</p>} fallback={<p>Checking…</p>}>
        <p>users page</p>
      </AdminShell>,
    );

    expect(screen.getByText("Checking…")).toBeInTheDocument();
    expect(screen.queryByText("users page")).not.toBeInTheDocument();
  });
});
