// Plain values, with no "use client", so a server component can import them.

/** The consent banner's text. Pass the app's own language. The defaults are English. */
export interface ConsentBannerStrings {
  title: string;
  /** What the visitor consents to. Name the tools and their purpose. */
  body: string;
  /** The text of the link to the cookie page. */
  cookiePolicy: string;
  accept: string;
  reject: string;
  /** Closes a reopened banner and keeps the earlier choice. */
  close: string;
}

export const defaultConsentBannerStrings: ConsentBannerStrings = {
  title: "Cookies for marketing",
  body:
    "We would like to use Meta Pixel to measure our ads and market to you on Meta's services. It sets cookies and sends Meta " +
    "information about your visit. Nothing is loaded unless you accept, and you can change your choice at any time.",
  cookiePolicy: "Read about cookies",
  accept: "Accept",
  reject: "Reject",
  close: "Close",
};

/** The cookie settings button's text. */
export interface ConsentSettingsLinkStrings {
  label: string;
}

export const defaultConsentSettingsLinkStrings: ConsentSettingsLinkStrings = {
  label: "Cookie settings",
};
