// Plain values, with no "use client", so a server component can import them.

import { PASSWORD_MIN_LENGTH } from "../validation/passwordRules";

// The rules passwordProblems checks, for the hint and the weak password text.
const passwordRules = `Use at least ${PASSWORD_MIN_LENGTH} characters, with at least one lowercase and one uppercase letter from A to Z and one digit from 0 to 9.`;

/**
 * The flow's text for each field error code of SjolystInnovation.AppKit.Auth's reset endpoints,
 * shown under the email, code or new password field. `{max}` in `passwordTooShort` becomes the
 * API's least number of characters. The flow shows the API's own message for a code that is not
 * here, such as `weakPassword` from a password rule the app adds.
 */
export interface ResetPasswordValidationStrings {
  required: string;
  invalidEmail: string;
  passwordTooShort: string;
  passwordRequiresDigit: string;
  passwordRequiresLower: string;
  passwordRequiresUpper: string;
  passwordRequiresNonAlphanumeric: string;
}

/**
 * The flow's text for each code of SjolystInnovation.AppKit.Auth's reset endpoints that is not
 * about one field. The flow shows the API's own message for a code that is not here.
 */
export interface ResetPasswordErrorStrings {
  /** The code is wrong or expired, or the email has no active account. */
  invalidResetCode: string;
  /** Five wrong codes in a row. The user has to ask for a new code. */
  tooManyResetAttempts: string;
}

/**
 * The reset flow's text. Pass the app's own language. The defaults are English. A text that is null
 * is left out of the page.
 */
export interface ResetPasswordFlowStrings {
  title: string;
  /** The text shown before the sign-in link under the title, such as "Remembered it?". */
  signInPrompt: string | null;
  signIn: string;
  /** The text of the link back to sign-in once the password is set. */
  backToSignIn: string;
  /** The text shown above the email field on the first step. */
  intro: string | null;
  /** The text shown at the top of the second step, once a code is on its way. */
  codeSent: string | null;
  email: string;
  code: string;
  newPassword: string;
  /** The text shown under the new password field. It gives way to the field's error while one shows. */
  passwordHint: string | null;
  requestCode: string;
  requestingCode: string;
  setPassword: string;
  settingPassword: string;
  /** The text shown when the password is set. Null shows the API's own message, or only the link when the API sends none. */
  done: string | null;
  /** The text shown for a password the rules refuse. Null lists each rule it breaks. */
  passwordInvalid: string | null;
  somethingWentWrong: string;
  /** The field error texts, by code. Any code left out keeps its default. */
  validation: ResetPasswordValidationStrings;
  /** The texts for the other refusals, by code. Any code left out keeps its default. */
  errors: ResetPasswordErrorStrings;
}

export const defaultResetPasswordFlowStrings: ResetPasswordFlowStrings = {
  title: "Reset password",
  signInPrompt: "Remembered it?",
  signIn: "Sign in",
  backToSignIn: "Back to sign in →",
  intro: "Enter your email address and we will send you a code.",
  codeSent: "Check your email for the reset code.",
  email: "Email",
  code: "Reset code",
  newPassword: "New password",
  passwordHint: passwordRules,
  requestCode: "Send reset code",
  requestingCode: "Sending…",
  setPassword: "Reset password",
  settingPassword: "Resetting…",
  done: "Your password has been changed. You can sign in now.",
  passwordInvalid: `The password does not meet the requirements. ${passwordRules}`,
  somethingWentWrong: "Something went wrong",
  validation: {
    required: "Required.",
    invalidEmail: "Not a valid email address.",
    passwordTooShort: "Passwords must be at least {max} characters.",
    passwordRequiresDigit: "Passwords must have at least one digit ('0'-'9').",
    passwordRequiresLower: "Passwords must have at least one lowercase ('a'-'z').",
    passwordRequiresUpper: "Passwords must have at least one uppercase ('A'-'Z').",
    passwordRequiresNonAlphanumeric: "Passwords must have at least one non alphanumeric character.",
  },
  errors: {
    invalidResetCode: "Invalid or expired reset code.",
    tooManyResetAttempts: "Too many attempts. Request a new reset code.",
  },
};
