import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog, type ConfirmDialogProps } from "../../ui";

const setup = (props: Partial<ConfirmDialogProps> = {}) => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(<ConfirmDialog title="Delete order" message="This cannot be undone." onConfirm={onConfirm} onClose={onClose} {...props} />);
  return { onConfirm, onClose };
};

describe("ConfirmDialog", () => {
  it("opens as a modal dialog named by its title, with the message and the default buttons", () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    setup();

    expect(showModal).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: "Delete order" })).toHaveTextContent("This cannot be undone.");
    expect(screen.getByRole("button", { name: "Confirm" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    showModal.mockRestore();
  });

  it("confirms and cancels through the buttons", async () => {
    const { onConfirm, onClose } = setup();

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("takes the app's button text and a confirm label for the action", () => {
    setup({ strings: { cancel: "Avbryt", confirm: "Bekreft" }, confirmLabel: "Slett" });

    expect(screen.getByRole("button", { name: "Slett" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Avbryt" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bekreft" })).not.toBeInTheDocument();
  });

  it("shows children under the message and turns confirm off while confirmDisabled", () => {
    setup({ confirmDisabled: true, children: <input aria-label="Amount" /> });

    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it("turns both buttons off and ignores Escape while busy", () => {
    setup({ busy: true });

    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    const escape = new Event("cancel", { cancelable: true });
    screen.getByRole("dialog").dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
  });

  it("lets Escape through when not busy, and reports the close", () => {
    const { onClose } = setup();
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;

    const escape = new Event("cancel", { cancelable: true });
    dialog.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(false);

    dialog.close();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not report a close while the dialog is still open", () => {
    const { onClose } = setup();

    fireEvent(screen.getByRole("dialog"), new Event("close"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes the native dialog when it unmounts", () => {
    const close = vi.spyOn(HTMLDialogElement.prototype, "close");
    const { unmount } = render(<ConfirmDialog title="t" message="m" onConfirm={() => {}} onClose={() => {}} />);

    unmount();

    expect(close).toHaveBeenCalledTimes(1);
    close.mockRestore();
  });

  it.each(["Cancel", "Confirm"])("gives focus back to the opener after %s unmounts the dialog", async (name) => {
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          {open && <ConfirmDialog title="t" message="m" onConfirm={() => setOpen(false)} onClose={() => setOpen(false)} />}
        </>
      );
    }
    render(<Host />);
    const trigger = screen.getByRole("button", { name: "Open" });
    await userEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
