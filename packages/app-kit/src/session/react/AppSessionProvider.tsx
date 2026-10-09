"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/** Four minutes, shorter than the five minutes before expiry when a refresh falls due. */
const SESSION_POLL_SECONDS = 4 * 60;

export interface AppSessionProviderProps {
  /** Seconds between session reads. Defaults to four minutes. */
  refetchInterval?: number | undefined;
  children: ReactNode;
}

/**
 * next-auth's `SessionProvider`, reading the session again on a timer. Each read lets the jwt
 * callback renew the access token ahead of expiry, so an open tab stays usable and does not find a
 * dead session on the next save. It also keeps what `useSession` reports in this tab up to date.
 * next-auth polls only once a session exists, so signed-out visitors cost nothing.
 */
export function AppSessionProvider({ refetchInterval = SESSION_POLL_SECONDS, children }: AppSessionProviderProps) {
  return <SessionProvider refetchInterval={refetchInterval}>{children}</SessionProvider>;
}
