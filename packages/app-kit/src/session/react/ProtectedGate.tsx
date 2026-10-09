"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSessionGate } from "./useSessionGate";

export interface ProtectedGateProps {
  /** Where a signed-out visitor, or a session dead on arrival, is sent. */
  loginHref: string;
  /** What shows while the page may not render yet. */
  fallback?: ReactNode | undefined;
  children: ReactNode;
}

/**
 * Renders a protected page only on a usable session, and keeps it rendered while the re-sign-in
 * prompt recovers the session. Never redirects while the prompt is open.
 */
export function ProtectedGate({ loginHref, fallback = null, children }: ProtectedGateProps) {
  const router = useRouter();
  const { status, promptOpen, usable, wasUsable, mayRender } = useSessionGate();

  useEffect(() => {
    // A page opened on a dead session must not render, or the user starts work they cannot save.
    // A session that dies later keeps the page, and the prompt recovers it in place.
    if (promptOpen) return;
    if (status === "unauthenticated" || (status === "authenticated" && !usable && !wasUsable)) {
      // replace, so Back does not return to a page that only redirects again.
      router.replace(loginHref);
    }
  }, [status, usable, wasUsable, promptOpen, router, loginHref]);

  return mayRender ? children : fallback;
}
