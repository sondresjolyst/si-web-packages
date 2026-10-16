import { z } from "zod";
import { withDefaults, type TextOverrides } from "../ui/withDefaults";
import { PASSWORD_MIN_LENGTH, defaultPasswordStrings, type PasswordStrings } from "./passwordRules";

export { PASSWORD_MIN_LENGTH, defaultPasswordStrings, passwordProblems } from "./passwordRules";
export type { PasswordStrings } from "./passwordRules";

/**
 * Builds a zod schema for a new password, with the rules the APIs enforce through ASP.NET Identity.
 * Identity counts only ASCII letters and digits, so "Å" is neither an uppercase nor a lowercase
 * letter here. Length counts UTF-16 code units, as Identity does. There is no upper limit, because
 * Identity has none. An app whose API sets one adds it with `.max()`. A failing password gets one
 * issue per rule it breaks.
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
