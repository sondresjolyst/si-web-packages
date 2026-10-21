"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { RoleGate, type RoleGateProps } from "../session/react/RoleGate";
import { withDefaults, type TextOverrides } from "../ui/withDefaults";
import { defaultAdminShellStrings, type AdminShellStrings } from "./adminShellStrings";

/** One section of the admin area, or its overview. */
export interface AdminTab {
  href: string;
  label: string;
}

type GateProps = RoleGateProps extends infer P ? (P extends unknown ? Omit<P, "children"> : never) : never;

/** Props for `AdminShell`. The gate props are `RoleGate`'s, without `children`. */
export type AdminShellProps = GateProps & {
  title: ReactNode;
  /** The overview and the sections. The breadcrumb names a page's section by its tab's label. */
  tabs: readonly AdminTab[];
  /** The overview page the breadcrumb links back to. Defaults to the first tab's `href`. */
  overviewHref?: string | undefined;
  strings?: TextOverrides<AdminShellStrings> | undefined;
  children: ReactNode;
};

const trimSlash = (path: string) => (path.endsWith("/") ? path.slice(0, -1) : path);

/** Whether `pathname` is `href` or a page below it. The match is by whole path segments. */
function isWithin(pathname: string, href: string) {
  const base = trimSlash(href);
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** The `href` of the tab that is current for `pathname`: the longest `href` that is the path or a parent of it. */
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
 * The admin area's frame, for users with `role` only. The overview page shows the title above the
 * page. Every other page also shows a breadcrumb above the heading, the title as a link back to the
 * overview and then the label of the page's section. On a section's pages the heading is the
 * section's label instead of the title. The overview is `overviewHref`, or else the
 * first tab. A section is a tab other than the overview. It is current on its own `href` and on the
 * pages below it. When several tabs match, the one with the longest `href` is current. The gate
 * props are `RoleGate`'s.
 */
export function AdminShell({ title, tabs, overviewHref, strings, children, ...gate }: AdminShellProps) {
  const pathname = usePathname();
  const text = withDefaults(defaultAdminShellStrings, strings);
  const overview = overviewHref ?? tabs[0]?.href;
  const onOverview = overview !== undefined && trimSlash(pathname) === trimSlash(overview);
  const current = activeHref(pathname, tabs);
  const section = tabs.find((tab) => tab.href === current && trimSlash(tab.href) !== trimSlash(overview ?? ""));
  const page = (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {overview !== undefined && !onOverview && (
        <nav aria-label={text.breadcrumb} className="mb-2 text-sm">
          <ol className="flex flex-wrap items-center gap-x-2">
            <li>
              <Link href={overview} className="text-admin-tab hover:text-admin-tab-hover transition-colors">
                {title}
              </Link>
            </li>
            {section && (
              <li className="flex items-center gap-x-2">
                <span aria-hidden="true" className="text-admin-tab">
                  /
                </span>
                <Link href={section.href} aria-current="page" className="font-medium text-admin-tab-active hover:text-admin-tab-hover transition-colors">
                  {section.label}
                </Link>
              </li>
            )}
          </ol>
        </nav>
      )}
      <h1 className="text-2xl font-black text-admin-title mb-8">{section ? section.label : title}</h1>
      {children}
    </div>
  );
  // The gate props arrive as one of RoleGate's two shapes, so they go back as that shape.
  return <RoleGate {...({ ...gate, children: page } as RoleGateProps)} />;
}
