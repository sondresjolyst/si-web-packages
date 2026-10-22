"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { defaultConfirmDialogStrings, type ConfirmDialogStrings } from "./confirmDialogStrings";
import { withDefaults, type TextOverrides } from "./withDefaults";

/** Props for `ConfirmDialog`. */
export interface ConfirmDialogProps {
  title: string;
  message: string;
  /** Replaces the confirm button's text from `strings`, such as the name of the action. */
  confirmLabel?: string | undefined;
  /** While the request runs, both buttons are off and Escape does nothing. */
  busy?: boolean | undefined;
  /** Whether the confirm button is off, for example while a field in the dialog is invalid. */
  confirmDisabled?: boolean | undefined;
  /** Extra content under the message, such as an amount field. */
  children?: ReactNode;
  onConfirm: () => void;
  /** Called when the dialog closes, by Cancel or Escape. Unmount the dialog here. */
  onClose: () => void;
  strings?: TextOverrides<ConfirmDialogStrings> | undefined;
}

const button = "rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50";

/**
 * A modal confirmation. Render it while a confirmation is pending and unmount it in `onClose`. The
 * native dialog traps focus, moves it in on open, closes on Escape and gives focus back to the
 * element that opened it.
 */
export function ConfirmDialog({ title, message, confirmLabel, busy = false, confirmDisabled = false, children, onConfirm, onClose, strings }: ConfirmDialogProps) {
  const text = withDefaults(defaultConfirmDialogStrings, strings);
  const headingId = useId();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={headingId}
      onCancel={(e) => {
        // Escape does nothing while the request runs.
        if (busy) e.preventDefault();
      }}
      onClose={(e) => {
        // A StrictMode remount closes and reopens the dialog, and the browser raises close after the reopen.
        if (!e.currentTarget.open) onClose();
      }}
      className="m-auto w-full max-w-md rounded-2xl p-6 shadow-xl backdrop:bg-black/40"
    >
      <div className="space-y-4">
        <h2 id={headingId} className="font-bold text-gray-900">
          {title}
        </h2>
        <p className="text-sm text-gray-700">{message}</p>
        {children}
        <div className="flex justify-end gap-3">
          <button type="button" disabled={busy} onClick={onClose} className={`${button} border border-gray-300 text-gray-900 hover:bg-gray-50`}>
            {text.cancel}
          </button>
          <button
            type="button"
            disabled={busy || confirmDisabled}
            onClick={onConfirm}
            className={`${button} rounded-button bg-button-primary-bg text-button-primary-text hover:brightness-95 transition`}
          >
            {confirmLabel ?? text.confirm}
          </button>
        </div>
      </div>
    </dialog>
  );
}
