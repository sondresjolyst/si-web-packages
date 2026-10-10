import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Toggle, type ToggleProps } from "../../ui";

describe("Toggle", () => {
  it("is a switch named by its label", () => {
    render(<Toggle label="Email notifications" checked={false} onChange={() => {}} />);
    const toggle = screen.getByRole("switch", { name: "Email notifications" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(toggle).toHaveAttribute("type", "button");
  });

  it("is named by aria-label when there is no label", () => {
    render(<Toggle aria-label="VAT" checked onChange={() => {}} />);
    expect(screen.getByRole("switch", { name: "VAT" })).toHaveAttribute("aria-checked", "true");
  });

  it("flips on a click, on a click on its label, and from the keyboard", async () => {
    const onChange = vi.fn();
    render(<Toggle label="Dark mode" checked={false} onChange={onChange} />);
    const toggle = screen.getByRole("switch");

    await userEvent.click(toggle);
    await userEvent.click(screen.getByText("Dark mode"));
    toggle.focus();
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledTimes(4);
    expect(onChange).toHaveBeenNthCalledWith(1, true);
  });

  it("passes the new state when it is on", async () => {
    const onChange = vi.fn();
    render(<Toggle aria-label="VAT" checked onChange={onChange} />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("does nothing while disabled", async () => {
    const onChange = vi.fn();
    render(<Toggle label="Dark mode" checked={false} onChange={onChange} disabled />);
    await userEvent.click(screen.getByRole("switch"));
    await userEvent.click(screen.getByText("Dark mode"));
    expect(screen.getByRole("switch")).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("lets the caller's onClick stop the change", async () => {
    const onChange = vi.fn();
    render(<Toggle aria-label="VAT" checked={false} onChange={onChange} onClick={e => e.preventDefault()} />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("puts className on the outer element", () => {
    const { rerender } = render(<Toggle label="Dark mode" className="ml-2" checked={false} onChange={() => {}} />);
    expect(screen.getByText("Dark mode")).toHaveClass("ml-2");
    expect(screen.getByRole("switch")).not.toHaveClass("ml-2");

    rerender(<Toggle aria-label="VAT" className="ml-2" checked={false} onChange={() => {}} />);
    expect(screen.getByRole("switch")).toHaveClass("ml-2");
  });

  it("colours the track from the theme", () => {
    const { rerender } = render(<Toggle aria-label="VAT" checked onChange={() => {}} />);
    expect(screen.getByRole("switch")).toHaveClass("bg-toggle-on");
    rerender(<Toggle aria-label="VAT" checked={false} onChange={() => {}} />);
    expect(screen.getByRole("switch")).toHaveClass("bg-toggle-off");
  });

  it("accepts a callback that ignores the new state", () => {
    // garge's ToggleSwitch callers pass () => void.
    const flip: () => void = () => {};
    const props: ToggleProps = { "aria-label": "VAT", checked: true, onChange: flip };
    expect(props.onChange).toBe(flip);
  });
});
