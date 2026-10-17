"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/** Props for `SmartLink`. */
export interface SmartLinkProps {
  href: string;
  className?: string | undefined;
  children: ReactNode;
}

/**
 * A link that scrolls smoothly to an anchor on the page, such as `#contact`, and goes through
 * next/link for anything else.
 */
export function SmartLink({ href, className, children }: SmartLinkProps) {
  if (href.startsWith("#")) {
    const id = href.slice(1);
    return (
      <a
        href={href}
        className={className}
        onClick={e => {
          const el = document.getElementById(id);
          if (el) {
            e.preventDefault();
            el.scrollIntoView({ behavior: "smooth" });
            history.replaceState(null, "", href);
          }
        }}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
