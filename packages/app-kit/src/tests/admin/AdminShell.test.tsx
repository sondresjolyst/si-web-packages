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

  it("wraps the tabs onto more rows instead of hiding them in a sideways scroll", () => {
    render(
      <AdminShell role="Admin" title="Admin" tabs={tabs} denied={<p>No access</p>}>
        <p>users page</p>
      </AdminShell>,
    );

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("flex", "flex-wrap");
    expect(nav.className).not.toMatch(/overflow|scrollbar/);
    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveClass("border-b-2", "whitespace-nowrap");
    }
  });

  it("marks the tab above a page below it", () => {
    navigation.pathname = "/no/admin/users/u1";
    render(
      <AdminShell role="Admin" title="Admin" tabs={tabs} denied={<p>No access</p>}>
        <p>user page</p>
      </AdminShell>,
    );

    expect(screen.getByRole("link", { current: "page" })).toHaveTextContent("Brukere");
  });

  describe("active tab on sub pages", () => {
    const nested = [
      { href: "/admin", label: "Overview" },
      { href: "/admin/shop", label: "Shop" },
      { href: "/admin/shop/orders", label: "Orders" },
      { href: "/admin/shopping", label: "Shopping" },
    ];

    function activeLabels(pathname: string) {
      navigation.pathname = pathname;
      render(
        <AdminShell role="Admin" title="Admin" tabs={nested} denied={<p>No access</p>}>
          <p>page</p>
        </AdminShell>,
      );
      return screen.queryAllByRole("link", { current: "page" }).map((link) => link.textContent);
    }

    it.each([
      ["/admin", ["Overview"]],
      ["/admin/shop", ["Shop"]],
      ["/admin/shop/settings", ["Shop"]],
      ["/admin/shop/5/edit", ["Shop"]],
      ["/admin/shop/orders", ["Orders"]],
      ["/admin/shop/orders/5", ["Orders"]],
      ["/admin/shopping", ["Shopping"]],
      ["/admin/shopping/cart", ["Shopping"]],
      ["/admin/other", ["Overview"]],
      ["/admin/shop/", ["Shop"]],
      ["/admin/shop/orders/", ["Orders"]],
      ["/no/admin", []],
    ])("marks %s as %j", (pathname, expected) => {
      expect(activeLabels(pathname)).toEqual(expected);
    });

    it("does not match a tab whose name only starts like the path", () => {
      navigation.pathname = "/admin/shopx";
      render(
        <AdminShell role="Admin" title="Admin" tabs={[{ href: "/admin/shop", label: "Shop" }]} denied={<p>No access</p>}>
          <p>page</p>
        </AdminShell>,
      );
      expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
    });

    it("marks a tab with a trailing slash on its href", () => {
      navigation.pathname = "/admin/shop/settings";
      render(
        <AdminShell role="Admin" title="Admin" tabs={[{ href: "/admin/shop/", label: "Shop" }]} denied={<p>No access</p>}>
          <p>page</p>
        </AdminShell>,
      );
      expect(screen.getByRole("link", { current: "page" })).toHaveTextContent("Shop");
    });

    it("picks the longest match whatever the order of the tabs", () => {
      navigation.pathname = "/admin/shop/orders/5";
      render(
        <AdminShell role="Admin" title="Admin" tabs={[...nested].reverse()} denied={<p>No access</p>}>
          <p>page</p>
        </AdminShell>,
      );
      expect(screen.getAllByRole("link", { current: "page" })).toHaveLength(1);
      expect(screen.getByRole("link", { current: "page" })).toHaveTextContent("Orders");
    });
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
