// Plain values, with no "use client", so a server component can import them.

/** Thrown inside app-kit from `onSignedIn` to refuse a sign-in. The form shows its message. Not exported. */
export class SignInRejected extends Error {}

/** The form's text. Pass the app's own language. The defaults are English. */
export interface CredentialsFormStrings {
  email: string;
  password: string;
  signIn: string;
  signingIn: string;
  invalidCredentials: string;
  /** The text for a login the API has locked after too many failed sign-ins. */
  lockedOut: string;
  signInUnavailable: string;
  somethingWentWrong: string;
  showPassword: string;
  hidePassword: string;
}

export const defaultCredentialsFormStrings: CredentialsFormStrings = {
  email: "Email",
  password: "Password",
  signIn: "Sign in",
  signingIn: "Signing in…",
  invalidCredentials: "Invalid email or password.",
  lockedOut: "Too many failed attempts. This login is temporarily locked, try again later.",
  signInUnavailable: "Sign-in is unavailable right now. Try again shortly.",
  somethingWentWrong: "Something went wrong",
  showPassword: "Show password",
  hidePassword: "Hide password",
};
