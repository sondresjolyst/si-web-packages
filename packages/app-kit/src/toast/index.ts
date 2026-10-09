import { toast as sonnerToast } from "sonner";
import { getSessionPromptOpen } from "../session/expiry";

// While the re-sign-in prompt is open it already tells the user why a request failed, so error
// toasts stay quiet. Every other toast passes through.
const error: typeof sonnerToast.error = (...args) => (getSessionPromptOpen() ? "" : sonnerToast.error(...args));

/** sonner's `toast`, except that error toasts stay quiet while the re-sign-in prompt is open. */
export const toast: typeof sonnerToast = new Proxy(sonnerToast, {
  get: (target, property, receiver) => (property === "error" ? error : Reflect.get(target, property, receiver)),
});
