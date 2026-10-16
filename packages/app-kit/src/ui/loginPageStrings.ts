// Plain values, with no "use client", so a server component can import them.

/** The sign-in page's text around the form. Pass the app's own language. The defaults are English. */
export interface LoginPageStrings {
  title: string;
  forgotPassword: string;
  /** The text shown before the register link, such as "No account?". Null leaves it out. */
  registerPrompt: string | null;
  register: string;
}

export const defaultLoginPageStrings: LoginPageStrings = {
  title: "Sign in",
  forgotPassword: "Forgot your password?",
  registerPrompt: "No account?",
  register: "Create one",
};
