"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { draftPrefix, type SessionConfig } from "../config";

const WRITE_DELAY_MS = 500;

// How long a draft is offered. Long enough to outlive an expired session or a closed tab, short
// enough that week-old work is not offered as if it were current. An expired draft is removed when
// its form next reads it.
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
   * The signed-in user's id. A browser profile can be shared, so the draft is stored per user.
   * Without that, the next person to sign in is offered the previous one's work. The last known
   * owner is kept, because a lost cookie reports nobody and that is the moment the draft matters
   * most. Nothing is stored until an owner is known.
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
 * A draft found at mount is offered for restore rather than applied, so an edit form never silently
 * overwrites what the API returned. Saving starts immediately either way. The offer is held in
 * memory, so the newest work is always the thing in storage.
 */
export function useFormDraft<T>(
  config: Pick<SessionConfig, "draftStoragePrefix">,
  { owner, scope, value }: FormDraftOptions<T>,
): FormDraft<T> {
  // Adjusted during render rather than in an effect, which is the supported way to derive state
  // from changing inputs.
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
    // Re-base on a key change too. The values on screen belong to the old key, and writing them
    // under the new one would put this form's work in another form's draft.
    untouched.current = json;
    // Reading the store is an external-system read, which is what an effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(key == null ? null : read<T>(key));
    // Keyed on the draft key alone on purpose. Re-reading whenever the values change would
    // re-offer a draft the user has already answered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (key == null) return;
    // Write only once the form differs from how it opened. Writing the pristine form would
    // overwrite the draft being offered before the user has answered.
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
    // Cancel a write that is already scheduled, and treat the current values as the new baseline.
    // Otherwise a save is followed by the draft being written back.
    if (writeTimer.current != null) window.clearTimeout(writeTimer.current);
    untouched.current = json;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // The draft is a convenience, not state anything depends on.
    }
  }, [key, json]);

  const dismiss = useCallback(() => setPending(null), []);

  return { pending, dismiss, clear };
}
