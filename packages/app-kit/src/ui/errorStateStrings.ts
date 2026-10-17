// Plain values, with no "use client", so a server component can import them.

/** The error page's text. Pass the app's own language. The defaults are English. */
export interface ErrorStateStrings {
  title: string;
  body: string;
  tryAgain: string;
  home: string;
}

export const defaultErrorStateStrings: ErrorStateStrings = {
  title: "Temporarily unavailable",
  body: "We can't reach the service right now. Please try again shortly.",
  tryAgain: "Try again",
  home: "Go to the front page",
};
