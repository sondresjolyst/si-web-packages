// Plain values, with no "use client", so a server component can import them.

/** The confirm dialog's button text. Pass the app's own language. The defaults are English. */
export interface ConfirmDialogStrings {
  confirm: string;
  cancel: string;
}

export const defaultConfirmDialogStrings: ConfirmDialogStrings = {
  confirm: "Confirm",
  cancel: "Cancel",
};
