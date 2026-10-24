"use client";

import { withDefaults, type TextOverrides } from "../ui/withDefaults";
import { defaultConsentSettingsLinkStrings, type ConsentSettingsLinkStrings } from "./consentBannerStrings";
import { openConsentSettings } from "./consentStore";

/** Props for `ConsentSettingsLink`. */
export interface ConsentSettingsLinkProps {
  /** Pass the same value as to `ConsentBanner`. When it is false, there is nothing to change, and the button is left out. */
  enabled?: boolean | undefined;
  /** Replaces the default classes, so it can match the footer's links. */
  className?: string | undefined;
  strings?: TextOverrides<ConsentSettingsLinkStrings> | undefined;
}

/** A button for the footer that opens the consent banner again, so withdrawing is as easy as consenting. */
export function ConsentSettingsLink({ enabled = true, className, strings }: ConsentSettingsLinkProps) {
  const text = withDefaults(defaultConsentSettingsLinkStrings, strings);
  if (!enabled) return null;
  return (
    <button
      type="button"
      onClick={openConsentSettings}
      className={
        className ??
        "underline underline-offset-2 hover:no-underline focus:outline-hidden focus-visible:ring-(length:--input-focus-ring-width) focus-visible:ring-input-focus-ring"
      }
    >
      {text.label}
    </button>
  );
}
