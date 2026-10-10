import { z } from "zod";
import { withDefaults, type TextOverrides } from "../ui/withDefaults";

/** The fewest characters a password may have. */
export const PASSWORD_MIN_LENGTH = 8;

/** The message for each password rule that fails. */
export interface PasswordStrings {
  tooShort: string;
  lowercase: string;
  uppercase: string;
  digit: string;
}

export const defaultPasswordStrings: PasswordStrings = {
  tooShort: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
  lowercase: "Include a lowercase letter from a to z.",
  uppercase: "Include an uppercase letter from A to Z.",
  digit: "Include a digit from 0 to 9.",
};

/**
 * A zod schema for a new password, with the rules the APIs enforce through ASP.NET Identity. Identity
 * counts only ASCII letters and digits, so "Å" is neither an uppercase nor a lowercase letter here.
 * Length counts UTF-16 code units, as Identity does. There is no upper limit, because Identity has
 * none. An app whose API sets one adds it with `.max()`. A failing password gets one issue per rule
 * it breaks.
 */
export function passwordSchema(strings?: TextOverrides<PasswordStrings>) {
  const text = withDefaults(defaultPasswordStrings, strings);
  return z
    .string()
    .min(PASSWORD_MIN_LENGTH, text.tooShort)
    .regex(/[a-z]/, text.lowercase)
    .regex(/[A-Z]/, text.uppercase)
    .regex(/[0-9]/, text.digit);
}
