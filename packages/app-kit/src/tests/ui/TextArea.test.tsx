import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TextArea } from "../../ui";

// jsdom does no layout, so the box's content height is set by hand and the line metrics come from
// an inline style that getComputedStyle reads back.
const metrics = { lineHeight: "20px", paddingTop: "8px", paddingBottom: "8px", borderTopWidth: "1px", borderBottomWidth: "1px", borderStyle: "solid" };
const box = (lines: number) => 20 * lines + 16 + 2;

function contentLines(lines: number) {
  vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get").mockReturnValue(20 * lines + 16);
}

afterEach(() => vi.restoreAllMocks());

describe("TextArea", () => {
  it("ties the label to the text area, even without an id or a name", () => {
    render(<TextArea label="Description" />);
    expect(screen.getByLabelText("Description")).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("ties each label to its own text area when two share a name", () => {
    render(
      <>
        <TextArea label="Notes" name="notes" />
        <TextArea label="More notes" name="notes" />
      </>,
    );
    const first = screen.getByLabelText("Notes");
    const second = screen.getByLabelText("More notes");
    expect(first).not.toBe(second);
    expect(first.id).not.toBe(second.id);
  });

  it("keeps the id the caller passes", () => {
    render(<TextArea label="Notes" id="notes-field" />);
    expect(screen.getByLabelText("Notes")).toHaveAttribute("id", "notes-field");
  });

  it("marks a required field, with the asterisk hidden from screen readers", () => {
    render(<TextArea label="Notes" required />);
    const area = screen.getByRole("textbox", { name: "Notes" });
    expect(area).toBeRequired();
    expect(area).toHaveAttribute("aria-required", "true");
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
  });

  it("links the error for screen readers", () => {
    render(<TextArea label="Notes" error="Too long" />);
    const area = screen.getByLabelText("Notes");
    expect(area).toHaveAttribute("aria-invalid", "true");
    expect(area).toHaveAccessibleDescription("Too long");
    expect(area).toHaveClass("border-input-border-error");
  });

  it("keeps the caller's aria-describedby alongside the error", () => {
    render(
      <>
        <p id="hint">Markdown is supported</p>
        <TextArea label="Notes" aria-describedby="hint" error="Too long" />
      </>,
    );
    expect(screen.getByLabelText("Notes")).toHaveAccessibleDescription("Markdown is supported Too long");
  });

  it("puts className on the outer element, and a caller cannot replace the box's styles", () => {
    render(<TextArea label="Notes" className="mt-2" />);
    const area = screen.getByLabelText("Notes");
    expect(area).not.toHaveClass("mt-2");
    expect(area).toHaveClass("rounded-input", "resize-none");
    expect(screen.getByText("Notes", { selector: "label" }).parentElement).toHaveClass("mt-2");
  });

  it("shows a resize handle when it does not grow", () => {
    render(<TextArea label="Notes" autoGrow={false} />);
    expect(screen.getByLabelText("Notes")).toHaveClass("resize-y");
  });

  it("grows a controlled box with its value, up to maxRows", async () => {
    function Controlled() {
      const [value, setValue] = useState("");
      return <TextArea label="Notes" value={value} onChange={e => setValue(e.target.value)} maxRows={6} style={metrics} />;
    }
    contentLines(1);
    render(<Controlled />);
    const area = screen.getByLabelText("Notes");
    expect(area.style.height).toBe(`${box(3)}px`);

    contentLines(5);
    await userEvent.type(area, "a");
    expect(area.style.height).toBe(`${box(5)}px`);

    contentLines(40);
    await userEvent.type(area, "b");
    expect(area.style.height).toBe(`${box(6)}px`);
  });

  it("grows an uncontrolled box as it is typed in, and keeps the caller's onInput", async () => {
    const onInput = vi.fn();
    contentLines(1);
    render(<TextArea label="Notes" defaultValue="" onInput={onInput} style={metrics} />);
    const area = screen.getByLabelText("Notes");
    expect(area.style.height).toBe(`${box(3)}px`);

    contentLines(7);
    await userEvent.type(area, "x");
    expect(area.style.height).toBe(`${box(7)}px`);
    expect(onInput).toHaveBeenCalled();
  });

  it("leaves the height alone when it does not grow", async () => {
    contentLines(9);
    render(<TextArea label="Notes" autoGrow={false} style={metrics} />);
    const area = screen.getByLabelText("Notes");
    await userEvent.type(area, "x");
    expect(area.style.height).toBe("");
  });
});
