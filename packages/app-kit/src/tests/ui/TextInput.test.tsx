import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextInput } from "../../ui";

describe("TextInput", () => {
  it("ties the label to the input", () => {
    render(<TextInput label="Email" name="email" />);
    expect(screen.getByLabelText("Email")).toBeInstanceOf(HTMLInputElement);
  });

  // Long forms often pass a label and nothing else. The field must still be identifiable to a
  // screen reader.
  it("ties the label to the input even without an id or a name", () => {
    render(<TextInput label="Title" />);
    expect(screen.getByLabelText("Title")).toBeInstanceOf(HTMLInputElement);
  });

  it("gives two fields without ids distinct ids", () => {
    render(
      <>
        <TextInput label="Amount" />
        <TextInput label="Unit" />
      </>,
    );
    const first = screen.getByLabelText("Amount");
    const second = screen.getByLabelText("Unit");
    expect(first.id).not.toBe("");
    expect(first.id).not.toBe(second.id);
  });

  it("ties each label to its own input when two fields share a name", () => {
    render(
      <>
        <TextInput label="Email" name="email" />
        <TextInput label="Confirm email" name="email" />
      </>,
    );
    const first = screen.getByLabelText("Email");
    const second = screen.getByLabelText("Confirm email");
    expect(first).not.toBe(second);
    expect(first.id).not.toBe(second.id);
  });

  it("keeps the id the caller passes", () => {
    render(<TextInput label="Email" id="email-field" name="email" autoComplete="email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("id", "email-field");
    expect(input).toHaveAttribute("autocomplete", "email");
  });

  it("marks a required field", () => {
    render(<TextInput label="Email" name="email" required />);
    const input = screen.getByLabelText(/Email/);
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-required", "true");
    expect(screen.getByText("*")).toBeInTheDocument();
    // The asterisk is for the eye. aria-required already tells a screen reader.
    expect(screen.getByRole("textbox", { name: "Email" })).toBe(input);
  });

  it("does not mark an optional field", () => {
    render(<TextInput label="Email" name="email" />);
    const input = screen.getByLabelText("Email");
    expect(input).not.toBeRequired();
    expect(input).not.toHaveAttribute("aria-required");
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("keeps an aria-required the caller passes without required", () => {
    render(<TextInput label="Email" name="email" aria-required="true" />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-required", "true");
  });

  it("shows the error", () => {
    render(<TextInput label="Email" name="email" error="Invalid email" />);
    expect(screen.getByText("Invalid email")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveClass("border-input-border-error");
  });

  it("links the error to the input for screen readers", () => {
    render(<TextInput label="Email" name="email" error="Invalid email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Invalid email");
  });

  it("links the error even when the name has a space in it", () => {
    render(<TextInput label="Work email" name="work email" error="Invalid email" />);
    expect(screen.getByLabelText("Work email")).toHaveAccessibleDescription("Invalid email");
  });

  it("keeps the caller's aria-describedby alongside the error", () => {
    render(
      <>
        <p id="hint">We never share it</p>
        <TextInput label="Email" name="email" aria-describedby="hint" error="Invalid email" />
      </>,
    );
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("We never share it Invalid email");
  });

  it("is not marked invalid without an error", () => {
    render(<TextInput label="Email" name="email" />);
    const input = screen.getByLabelText("Email");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("puts className on the outer element", () => {
    render(<TextInput label="Email" name="email" className="mt-2" />);
    expect(screen.getByLabelText("Email")).not.toHaveClass("mt-2");
    expect(screen.getByText("Email", { selector: "label" }).parentElement).toHaveClass("mt-2");
  });
});
