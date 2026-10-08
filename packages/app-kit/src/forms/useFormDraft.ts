"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { draftPrefix, type SessionConfig } from "../config";

const WRITE_DELAY_MS = 500;

// How long a draft is offered. Long enough to outlive an expired session or a closed tab. Short
// enough that stale work is not offered as current. A form removes its expired draft on next read.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface Envelope<T> {
  savedAt: number;
  value: T;
}

function read<T>(storageKey: string): T | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw == null) return null;

    const envelope = JSON.parse(raw) as Envelope<T> | null;
    const fresh =
      typeof envelope?.savedAt === "number" && Date.now() - envelope.savedAt <= MAX_AGE_MS;
    if (!fresh || envelope?.value === undefined) {
      window.localStorage.removeItem(storageKey);
      return null;
    }
    return envelope.value;
  } catch {
    return null;
  }
}

export interface FormDraftOptions<T> {
  /**
   * The signed-in user's id. A browser profile can be shared, so drafts are stored per user. That
   * way nobody is offered another user's work. The hook keeps the last known owner. A lost cookie
   * reports nobody, and that is when the draft matters most. Nothing is stored until an owner is
   * known.
   */
  owner: string | undefined;
  /** Identifies the form and the entity it edits, for example `recipe:new` or `recipe:42`. */
  scope: string;
  /** The form's current values. They must survive `JSON.stringify`. */
  value: T;
}

export interface FormDraft<T> {
  /**
   * The stored draft, while it is still waiting to be restored or dismissed. Read once the owner is
   * known and again whenever the owner or scope changes, so it can appear after mount.
   */
  pending: T | null;
  /** Stop offering the draft. The caller applies the values it wants. */
  dismiss: () => void;
  /** Drop the stored draft after a successful save. */
  clear: () => void;
}

/**
 * Keeps a form's values in localStorage so a sign-out, reload or closed tab does not lose them.
 * Values are written half a second after the last change, so only that last half second is at risk.
 *
 * A draft found at mount is offered for restore, not applied. So an edit form never silently
 * overwrites what the API returned. Saving starts at once, whether or not the offer is answered.
 * The offer is held in memory, so storage always holds the newest work.
 */
export function useFormDraft<T>(
  config: Pick<SessionConfig, "draftStoragePrefix">,
  { owner, scope, value }: FormDraftOptions<T>,
): FormDraft<T> {
  // Set during render, which is React's supported way to derive state from changing inputs.
  const [lastOwner, setLastOwner] = useState<string | undefined>(undefined);
  if (owner && owner !== lastOwner) setLastOwner(owner);

  // Checked before the owner is known, so a bad prefix fails on the first render, signed in or not.
  const prefix = draftPrefix(config);
  const key = lastOwner ? `${prefix}${lastOwner}:${scope}` : null;

  const [pending, setPending] = useState<T | null>(null);
  const json = JSON.stringify(value);
  const untouched = useRef(json);
  const writeTimer = useRef<number | null>(null);

  useEffect(() => {
    // Re-base on a key change too. The values on screen belong to the old key and must not land
    // in the new key's draft.
    untouched.current = json;
    // Reading storage is an external-system read, which belongs in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(key == null ? null : read<T>(key));
    // Runs on a key change only. Re-reading on every value change would re-offer a draft the user
    // has already answered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (key == null) return;
    // Write only once the form differs from how it opened, so the pristine form never overwrites
    // a draft that is still on offer.
    if (json === untouched.current) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
      } catch {
        // A full or blocked store must not break the form.
      }
    }, WRITE_DELAY_MS);
    writeTimer.current = timer;
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, json]);

  const clear = useCallback(() => {
    if (key == null) return;
    // Cancel any scheduled write and make the current values the baseline, so a save is never
    // followed by a fresh draft write.
    if (writeTimer.current != null) window.clearTimeout(writeTimer.current);
    untouched.current = json;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // The draft is a convenience. Nothing depends on it.
    }
  }, [key, json]);

  const dismiss = useCallback(() => setPending(null), []);

  return { pending, dismiss, clear };
}
