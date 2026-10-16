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

/**
 * The admin area's frame: a title and a tab bar above the page, for users with `role` only. The tab
 * whose `href` is the current path shows as active. The gate props are `RoleGate`'s.
 */
export function AdminShell({ title, tabs, children, ...gate }: AdminShellProps) {
  const pathname = usePathname();
  const page = (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-black text-admin-title mb-4">{title}</h1>
      <nav className="flex gap-1 border-b border-admin-border mb-8 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors shrink-0 whitespace-nowrap ${
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
