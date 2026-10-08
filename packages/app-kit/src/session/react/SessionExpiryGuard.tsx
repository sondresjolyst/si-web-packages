"use client";

import { getSession, signOut, useSession } from "next-auth/react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Alert } from "../../ui/Alert";
import { CredentialsForm } from "../../ui/CredentialsForm";
import { SignInRejected, type CredentialsFormStrings } from "../../ui/credentialsFormStrings";
import { withDefaults, type TextOverrides } from "../../ui/withDefaults";
import {
  closeSessionPrompt,
  getSessionPromptOpen,
  isTerminalSessionError,
  openSessionPrompt,
  subscribeSessionPrompt,
} from "../expiry";
import { defaultSessionExpiryGuardStrings, type SessionExpiryGuardStrings } from "./sessionExpiryGuardStrings";

// The absolute expiry cannot be refreshed away, so the banner warns while there is still time.
const WARN_BEFORE_MS = 30 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
// The minutes left at which a screen reader hears the countdown again, after it first appears.
const ANNOUNCE_AT_MINUTES = [10, 5, 1];

// Timers pause while a computer sleeps, so no wait runs longer than this. The banner is then at most
// this late after a wake. It also keeps every wait far below the browser's 32-bit timer limit.
const MAX_WAIT_MS = 5 * MINUTE_MS;

// How long until the banner text can next change: the warning starts, the minute count drops, or
// the session expires. Null when nothing more can change.
function msUntilNextChange(remaining: number): number | null {
  if (remaining <= 0) return null;
  const wait = remaining > WARN_BEFORE_MS ? remaining - WARN_BEFORE_MS : remaining % MINUTE_MS || MINUTE_MS;
  return Math.min(wait, MAX_WAIT_MS);
}


export interface SessionExpiryGuardProps {
  /** Where a sign-in as a different user is sent after it is signed out. */
  loginHref: string;
  /** Runs after the prompt signs the user back in, such as to show a toast. */
  onRestored?: (() => void) | undefined;
  strings?: TextOverrides<SessionExpiryGuardStrings> | undefined;
  formStrings?: TextOverrides<CredentialsFormStrings> | undefined;
}

type User = { id?: string; email?: string | null };
type Owner = { id: string; email: string };

/**
 * Warns before the session's absolute expiry, and signs the user back in without leaving the page
 * when a request finds a dead session. Render it once, inside the SessionProvider.
 */
export function SessionExpiryGuard({ loginHref, onRestored, strings, formStrings }: SessionExpiryGuardProps) {
  const text = withDefaults(defaultSessionExpiryGuardStrings, strings);
  const { data: session, status } = useSession();
  const sessionInfo = session as { user?: User; error?: string; absoluteExpiresAt?: number } | null;

  const open = useSyncExternalStore(subscribeSessionPrompt, getSessionPromptOpen, () => false);

  // The signed-in user. Latched, because a re-read after a lost cookie reports nobody.
  const [owner, setOwner] = useState<Owner | null>(null);
  const current = sessionInfo?.user;
  // Not while the prompt is open, unless no owner is known yet. A sign-in in the prompt must be
  // checked against the owner, not become it.
  if (current?.id && current.id !== owner?.id && (!open || !owner)) {
    setOwner({ id: current.id, email: current.email ?? "" });
  }
  // The user the session reports now, for the sign-in check when the read-back finds nobody.
  const liveUser = useRef<User | undefined>(undefined);
  useEffect(() => {
    liveUser.current = current;
  });

  // The minutes left when the countdown banner opened the prompt. Null when a failed request opened
  // it. Kept while the prompt is open, so the wording does not change under the user mid sign-in.
  const [bannerMinutes, setBannerMinutes] = useState<number | null>(null);
  // Cleared when the prompt closes, so a later prompt from a failed request does not reuse it.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setBannerMinutes(null);
  }
  // A sign-in is in flight. Closing then would hide its outcome.
  const [pending, setPending] = useState(false);

  // The clock lives in state, so rendering stays pure. A timer reads it again when the banner can
  // change, and at least every few minutes.
  const [now, setNow] = useState(() => Date.now());
  const remaining =
    status === "authenticated" && sessionInfo?.absoluteExpiresAt != null
      ? sessionInfo.absoluteExpiresAt - now
      : null;
  useEffect(() => {
    const wait = remaining == null ? null : msUntilNextChange(remaining);
    if (wait == null) return;
    const timer = window.setTimeout(() => setNow(Date.now()), wait);
    return () => window.clearTimeout(timer);
  }, [remaining]);
  // A tab coming back, often after the computer slept, reads the clock again at once.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Rounded up, so the last half minute reads 1 min, not 0.
  const minutesLeft =
    remaining != null && remaining > 0 && remaining <= WARN_BEFORE_MS ? Math.ceil(remaining / MINUTE_MS) : null;
  const expired =
    status === "authenticated" &&
    (isTerminalSessionError(sessionInfo?.error) || (remaining != null && remaining <= 0));

  const countdown = (minutes: number | null) => text.expiringSoon.replaceAll("{minutes}", String(minutes));

  // The minutes a screen reader last heard. Every change of a status region is announced, so it
  // changes only when the countdown starts and when it passes one of ANNOUNCE_AT_MINUTES.
  const [announcedMinutes, setAnnouncedMinutes] = useState<number | null>(null);
  const announceNow =
    minutesLeft == null
      ? null
      : announcedMinutes == null || ANNOUNCE_AT_MINUTES.some((at) => minutesLeft <= at && announcedMinutes > at)
        ? minutesLeft
        : announcedMinutes;
  if (announceNow !== announcedMinutes) setAnnouncedMinutes(announceNow);

  // An open prompt stops the gate from redirecting, so the prompt closes when the guard unmounts.
  useEffect(() => closeSessionPrompt, []);

  // Who the prompt opened for. signIn replaces the session before it resolves, so the live owner
  // would already be the account that just signed in.
  const promptOwner = useRef<Owner | null>(null);
  useEffect(() => {
    if (!open) {
      promptOwner.current = null;
      return;
    }
    // Only on the way open. Reassigning while open would adopt the new account.
    promptOwner.current ??= owner;
  }, [open, owner]);

  const dialog = useRef<HTMLDivElement | null>(null);
  // The keydown handler is bound once per opening, so it reads pending through a ref.
  const pendingRef = useRef(false);
  const onPendingChange = (next: boolean) => {
    pendingRef.current = next;
    setPending(next);
  };
  const titleId = useId();

  // Escape closes the dialog, except while a sign-in is pending. Tab cycles inside the dialog, even
  // when focus has left it. Focus starts on the password field and returns where it was afterwards.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(dialog.current?.querySelectorAll<HTMLElement>("input, button:not([disabled])") ?? []);

    focusable()
      .find((element) => element instanceof HTMLInputElement && element.type === "password")
      ?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!pendingRef.current) closeSessionPrompt();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) return;
      const edge = event.shiftKey ? first : last;
      const outside = !dialog.current?.contains(document.activeElement);
      if (outside || document.activeElement === edge) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // The control that opened the prompt may be gone by now, such as the banner's button.
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);

  // A session read already in flight can answer after the sign-out and set the cookie again. So
  // the session is checked and the sign-out repeated, and the page is left whatever happens.
  const signOutFully = async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await signOut({ redirect: false });
        if (!(await getSession({ broadcast: false }))) break;
      } catch {
        break;
      }
    }
    window.location.assign(loginHref);
  };

  const signedIn = async () => {
    // Read the session back, and only report success when it can save.
    let next = (await getSession()) as { user?: User; error?: string } | null;
    // A failed read-back with nobody known yet says nothing about who signed in, so read again.
    for (let attempt = 0; attempt < 2 && !next && !liveUser.current?.id; attempt++) {
      next = (await getSession({ broadcast: false })) as { user?: User; error?: string } | null;
    }
    // The form on the page belongs to whoever opened it. signIn has already replaced the session,
    // so a different account is signed out, even when the read-back failed. The opener's draft
    // stays stored under the opener's id, and comes back when they sign in.
    const opener = promptOwner.current ?? owner;
    // A session without an id counts as another account. When the read-back failed, only a known
    // id counts.
    const signedInId = next ? next.user?.id : liveUser.current?.id;
    if (opener && (next || signedInId) && signedInId !== opener.id) {
      await signOutFully();
      throw new SignInRejected(text.wrongUser);
    }
    if (!next || isTerminalSessionError(next.error)) {
      throw new SignInRejected(text.notRestored);
    }
    closeSessionPrompt();
    onRestored?.();
  };

  return (
    <>
      {/* Mounted from the start, because a screen reader skips text that arrives with its region. */}
      <div role="status" className="sr-only">
        {!expired && announcedMinutes != null ? countdown(announcedMinutes) : ""}
      </div>
      <div role="alert" className="sr-only">
        {expired ? text.expiredBody : ""}
      </div>
      {(expired || minutesLeft != null) && (
        // At the bottom, because a sticky navbar usually holds the top at the same stacking level.
        <div className="fixed inset-x-0 bottom-0 z-40">
          <Alert variant="warning" role="none">
            <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
              <span>{expired ? text.expiredBody : countdown(minutesLeft)}</span>
              <button
                type="button"
                onClick={() => {
                  if (!expired) setBannerMinutes(minutesLeft);
                  openSessionPrompt();
                }}
                className="font-semibold underline underline-offset-2"
              >
                {text.reSignIn}
              </button>
            </div>
          </Alert>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dialog-backdrop px-4">
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-sm rounded-dialog bg-dialog-bg p-6 shadow-xl"
          >
            <h2 id={titleId} className="text-lg font-bold text-dialog-title">
              {bannerMinutes != null ? text.reSignIn : text.expiredTitle}
            </h2>
            <p className="mt-1 mb-4 text-sm text-dialog-text">
              {bannerMinutes != null ? countdown(bannerMinutes) : text.expiredBody}
            </p>
            <CredentialsForm
              initialEmail={owner?.email ?? ""}
              onSignedIn={signedIn}
              strings={formStrings}
              onPendingChange={onPendingChange}
            >
              <button
                type="button"
                onClick={closeSessionPrompt}
                disabled={pending}
                className="rounded-button border border-button-secondary-border px-4 text-sm font-medium text-button-secondary-text hover:bg-button-secondary-hover-bg"
              >
                {text.close}
              </button>
            </CredentialsForm>
          </div>
        </div>
      )}
    </>
  );
}
