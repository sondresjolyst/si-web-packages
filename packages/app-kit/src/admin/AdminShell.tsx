"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { RoleGate, type RoleGateProps } from "../session/react/RoleGate";

/** One tab in the admin navigation. */
export interface AdminTab {
  href: string;
  label: string;
}

type GateProps = RoleGateProps extends infer P ? (P extends unknown ? Omit<P, "children"> : never) : never;

/** Props for `AdminShell`. The gate props are `RoleGate`'s, without `children`. */
export type AdminShellProps = GateProps & {
  title: ReactNode;
  tabs: readonly AdminTab[];
  children: ReactNode;
};

const trimSlash = (path: string) => (path.endsWith("/") ? path.slice(0, -1) : path);

/** Whether `pathname` is `href` or a page below it. The match is by whole path segments. */
function isWithin(pathname: string, href: string) {
  const base = trimSlash(href);
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** The `href` of the tab that is active for `pathname`: the longest `href` that is the path or a parent of it. */
function activeHref(pathname: string, tabs: readonly AdminTab[]) {
  let active: string | undefined;
  for (const { href } of tabs) {
    if (isWithin(pathname, href) && (active === undefined || href.length > active.length)) {
      active = href;
    }
  }
  return active;
}

/**
 * The admin area's frame: a title and a tab bar above the page, for users with `role` only. The tabs
 * wrap onto more rows when they do not fit, and each tab draws its own underline. A tab
 * is active on its own `href` and on the pages below it. When several tabs match, only the one
 * with the longest `href` is active. The gate props are `RoleGate`'s.
 */
export function AdminShell({ title, tabs, children, ...gate }: AdminShellProps) {
  const pathname = usePathname();
  const current = activeHref(pathname, tabs);
  const page = (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-black text-admin-title mb-4">{title}</h1>
      <nav className="flex flex-wrap gap-x-1 border-b border-admin-border mb-8">
        {tabs.map((tab) => {
          const active = tab.href === current;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                active ? "border-admin-tab-indicator text-admin-tab-active" : "border-transparent text-admin-tab hover:text-admin-tab-hover"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
  // The gate props arrive as one of RoleGate's two shapes, so they go back as that shape.
  return <RoleGate {...({ ...gate, children: page } as RoleGateProps)} />;
}
