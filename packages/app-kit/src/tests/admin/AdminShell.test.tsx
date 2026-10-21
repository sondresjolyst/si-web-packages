import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { AdminShell, type AdminShellProps } from "../../admin";
import { makeSession, navigation, resetTestMocks, setSession } from "../../testing";

vi.mock("next/navigation", async () => (await import("../../testing")).nextNavigationMock());
vi.mock("next-auth/react", async () => (await import("../../testing")).nextAuthMock());

const tabs = [
  { href: "/no/admin", label: "Oversikt" },
  { href: "/no/admin/shop", label: "Butikk" },
  { href: "/no/admin/users", label: "Brukere" },
  { href: "/no/admin/legal", label: "Juridisk" },
];

type ShellOptions = Partial<Pick<AdminShellProps, "tabs" | "overviewHref" | "strings">> & { fallback?: ReactNode };

function renderShell(pathname: string, props: ShellOptions = {}) {
  navigation.pathname = pathname;
  return render(
    <AdminShell role="Admin" title="Admin" tabs={tabs} denied={<p>No access</p>} {...props}>
      <p>page</p>
    </AdminShell>,
  );
}

const breadcrumb = () => screen.queryByRole("navigation", { name: "Breadcrumb" });

describe("AdminShell", () => {
  beforeEach(() => {
    resetTestMocks();
    setSession(makeSession());
  });

  it("shows only the title and the page on the overview, with no breadcrumb and no tabs", () => {
    renderShell("/no/admin");

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Admin$/);
    expect(screen.getByText("page")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("treats the overview with a trailing slash as the overview", () => {
    renderShell("/no/admin/");

    expect(breadcrumb()).not.toBeInTheDocument();
  });

  it("shows Admin / Butikk on a section page, with Admin linking back to the overview", () => {
    renderShell("/no/admin/shop");

    const nav = breadcrumb();
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveTextContent("Admin/Butikk");
    const links = within(nav!).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Admin", "Butikk"]);
    expect(links[0]).toHaveAttribute("href", "/no/admin");
    expect(links[0]).not.toHaveAttribute("aria-current");
    expect(links[1]).toHaveAttribute("href", "/no/admin/shop");
    expect(links[1]).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Butikk$/);
  });

  it("shows no tab bar for the other sections", () => {
    renderShell("/no/admin/shop");

    expect(screen.getAllByRole("navigation")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Brukere" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Juridisk" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Oversikt" })).not.toBeInTheDocument();
  });

  it("names a sub page by the section above it", () => {
    renderShell("/no/admin/shop/orders/5");

    expect(screen.getByRole("link", { current: "page" })).toHaveTextContent("Butikk");
    expect(screen.getByRole("link", { current: "page" })).toHaveAttribute("href", "/no/admin/shop");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Butikk$/);
  });

  it("lets the breadcrumb wrap instead of scrolling sideways", () => {
    renderShell("/no/admin/shop");

    const list = within(breadcrumb()!).getByRole("list");
    expect(list).toHaveClass("flex", "flex-wrap");
    expect(list.className).not.toMatch(/overflow|scrollbar/);
  });

  it("links back to overviewHref when it is given", () => {
    renderShell("/no/admin/shop", { overviewHref: "/no/admin/start", tabs: tabs.slice(1) });

    expect(within(breadcrumb()!).getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/no/admin/start");
  });

  it("shows no breadcrumb on overviewHref", () => {
    renderShell("/no/admin/start", { overviewHref: "/no/admin/start", tabs: tabs.slice(1) });

    expect(breadcrumb()).not.toBeInTheDocument();
  });

  it("shows only the link back on an admin page outside every section", () => {
    renderShell("/no/admin/other");

    expect(within(breadcrumb()!).getAllByRole("link").map((link) => link.textContent)).toEqual(["Admin"]);
    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Admin$/);
  });

  it("takes the breadcrumb's name from strings", () => {
    renderShell("/no/admin/shop", { strings: { breadcrumb: "Brødsmulesti" } });

    expect(screen.getByRole("navigation", { name: "Brødsmulesti" })).toBeInTheDocument();
  });

  describe("current section on sub pages", () => {
    const nested = [
      { href: "/admin", label: "Overview" },
      { href: "/admin/shop", label: "Shop" },
      { href: "/admin/shop/orders", label: "Orders" },
      { href: "/admin/shopping", label: "Shopping" },
    ];

    function currentLabels(pathname: string, list = nested) {
      renderShell(pathname, { tabs: list });
      return screen.queryAllByRole("link", { current: "page" }).map((link) => link.textContent);
    }

    it.each([
      ["/admin", []],
      ["/admin/shop", ["Shop"]],
      ["/admin/shop/settings", ["Shop"]],
      ["/admin/shop/5/edit", ["Shop"]],
      ["/admin/shop/orders", ["Orders"]],
      ["/admin/shop/orders/5", ["Orders"]],
      ["/admin/shopping", ["Shopping"]],
      ["/admin/shopping/cart", ["Shopping"]],
      ["/admin/other", []],
      ["/admin/shop/", ["Shop"]],
      ["/admin/shop/orders/", ["Orders"]],
      ["/no/admin", []],
    ])("marks %s as %j", (pathname, expected) => {
      expect(currentLabels(pathname)).toEqual(expected);
    });

    it("does not match a section whose name only starts like the path", () => {
      expect(currentLabels("/admin/shopx", [{ href: "/admin", label: "Overview" }, { href: "/admin/shop", label: "Shop" }])).toEqual([]);
    });

    it("matches a section with a trailing slash on its href", () => {
      expect(currentLabels("/admin/shop/settings", [{ href: "/admin", label: "Overview" }, { href: "/admin/shop/", label: "Shop" }])).toEqual(["Shop"]);
    });

    it("picks the longest match whatever the order of the tabs", () => {
      renderShell("/admin/shop/orders/5", { tabs: [...nested].reverse(), overviewHref: "/admin" });
      expect(screen.getAllByRole("link", { current: "page" })).toHaveLength(1);
      expect(screen.getByRole("link", { current: "page" })).toHaveTextContent("Orders");
    });
  });

  it("shows the denied block instead of the frame to a user without the role", () => {
    setSession(makeSession({ roles: [] }));
    renderShell("/no/admin/users");

    expect(screen.getByText("No access")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByText("page")).not.toBeInTheDocument();
  });

  it("sends a user without the role to deniedHref", () => {
    setSession(makeSession({ roles: [] }));
    navigation.pathname = "/no/admin/users";
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
    renderShell("/no/admin/users", { fallback: <p>Checking…</p> });

    expect(screen.getByText("Checking…")).toBeInTheDocument();
    expect(screen.queryByText("page")).not.toBeInTheDocument();
  });
});
