import "@testing-library/jest-dom/vitest";

// jsdom has no modal dialog. This stands in for the browser's open and close. Unlike a browser, which
// queues the close event, close() here fires it synchronously.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
    // A browser moves focus into the dialog, to its first focusable element.
    this.querySelector<HTMLElement>("button:not([disabled]), input, select, textarea, [tabindex]")?.focus();
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}
