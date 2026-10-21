// Plain values, with no "use client", so a server component can import them.

/** The admin frame's text. Pass the app's own language. The defaults are English. */
export interface AdminShellStrings {
  /** The name of the breadcrumb, for screen readers. */
  breadcrumb: string;
}

export const defaultAdminShellStrings: AdminShellStrings = {
  breadcrumb: "Breadcrumb",
};
