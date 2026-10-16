// Plain values, with no "use client", so a server component can import them.

/**
 * The reset flow's text. Pass the app's own language. The defaults are English. A text that is null
 * is left out of the page.
 */
export interface ResetPasswordFlowStrings {
  title: string;
  /** Shown before the sign-in link under the title, such as "Remembered it?". */
  signInPrompt: string | null;
  signIn: string;
  /** The link back to sign-in once the password is set. */
  backToSignIn: string;
  /** Shown above the email field on the first step. */
  intro: string | null;
  /** Shown at the top of the second step, once a code is on its way. */
  codeSent: string | null;
  email: string;
  code: string;
  newPassword: string;
  /** Shown under the new password field. */
  passwordHint: string | null;
  requestCode: string;
  requestingCode: string;
  setPassword: string;
  settingPassword: string;
  /** Shown when the password is set. Null shows the API's own message, or only the link when it sends none. */
  done: string | null;
  /** Shown for a password the rules refuse. Null lists each rule it breaks. */
  passwordInvalid: string | null;
  somethingWentWrong: string;
}

export const defaultResetPasswordFlowStrings: ResetPasswordFlowStrings = {
  title: "Reset password",
  signInPrompt: "Remembered it?",
  signIn: "Sign in",
  backToSignIn: "Back to sign in →",
  intro: null,
  codeSent: "Check your email for the reset code.",
  email: "Email",
  code: "Reset code",
  newPassword: "New password",
  passwordHint: null,
  requestCode: "Send reset code",
  requestingCode: "Sending…",
  setPassword: "Reset password",
  settingPassword: "Resetting…",
  done: null,
  passwordInvalid: null,
  somethingWentWrong: "Something went wrong",
};
