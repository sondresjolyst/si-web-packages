"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { getSessionPromptOpen, isTerminalSessionError, subscribeSessionPrompt } from "../expiry";

/**
 * Whether a protected page may render, and whether it must stay rendered.
 *
 * Every gate on the way down should use this, so they agree. A nested layout that decides on its
 * own to blank the page undoes the in-place recovery the re-sign-in prompt exists for, and the user
 * loses the form anyway.
 */
export function useSessionGate() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const promptOpen = useSyncExternalStore(
    subscribeSessionPrompt,
    getSessionPromptOpen,
    () => false,
  );

  // The jwt callback copies its error onto the session. Read it without requiring the app to have
  // added `error` to next-auth's Session type.
  const error = (session as { error?: string } | null)?.error;
  const usable = status === "authenticated" && !isTerminalSessionError(error);

  // Which page last rendered on a healthy session. Keyed by path, so each page starts the check
  // again and a session that died on the previous page cannot carry a stale pass into a fresh form.
  // Adjusted during render rather than in an effect, which is the supported way to derive state
  // from changing inputs.
  // Undefined until then rather than null, because usePathname can itself return null.
  const [usableAt, setUsableAt] = useState<string | null | undefined>(undefined);
  if (usable && usableAt !== pathname) setUsableAt(pathname);
  const wasUsable = usableAt === pathname;

  // The page is already open and the prompt is recovering the session in place.
  const recovering = promptOpen && wasUsable;

  return {
    session,
    status,
    promptOpen,
    usable,
    wasUsable,
    recovering,
    /**
     * The one answer every gate on the way down uses. A layout that decides this again can blank
     * the page that the gate above it chose to keep.
     */
    mayRender:
      recovering ||
      !(
        (status === "loading" && !wasUsable) ||
        status === "unauthenticated" ||
        (!usable && !wasUsable)
      ),
  };
}

/** What `useSessionGate` returns. */
export type SessionGate = ReturnType<typeof useSessionGate>;
