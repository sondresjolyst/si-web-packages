import { withDefaults, type TextOverrides } from "../ui/withDefaults";

// No zod here, so the reset form in /ui can check a password without the optional zod peer.

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
 * Lists the message of every password rule the password breaks, in the order `passwordSchema`
 * checks them. An empty list means the APIs accept it.
 */
export function passwordProblems(password: string, strings?: TextOverrides<PasswordStrings>): string[] {
  const text = withDefaults(defaultPasswordStrings, strings);
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) problems.push(text.tooShort);
  if (!/[a-z]/.test(password)) problems.push(text.lowercase);
  if (!/[A-Z]/.test(password)) problems.push(text.uppercase);
  if (!/[0-9]/.test(password)) problems.push(text.digit);
  return problems;
}
