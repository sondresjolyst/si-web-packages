// Plain values, with no "use client", so a server component can import them.

/** The not-found page's text. Pass the app's own language. The defaults are English. */
export interface NotFoundStateStrings {
  code: string;
  body: string;
  home: string;
}

export const defaultNotFoundStateStrings: NotFoundStateStrings = {
  code: "404",
  body: "This page does not exist.",
  home: "Go home",
};
