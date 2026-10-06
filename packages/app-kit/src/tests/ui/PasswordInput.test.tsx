import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "../../ui";

describe("PasswordInput", () => {
  it("ties the label to the input", () => {
    render(<PasswordInput label="Password" name="password" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("ties the label to the input even without an id or a name", () => {
    render(<PasswordInput label="Password" />);
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("toggles visibility and the button label", async () => {
    const user = userEvent.setup();
    render(<PasswordInput label="Password" name="password" />);
    const input = screen.getByLabelText("Password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("puts the toggle in the tab order right after the input", async () => {
    const user = userEvent.setup();
    render(
      <>
        <PasswordInput label="Password" name="password" />
        <button type="submit">Sign in</button>
      </>,
    );

    await user.tab();
    expect(screen.getByLabelText("Password")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Show password" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    await user.tab();
    expect(screen.getByRole("button", { name: "Sign in" })).toHaveFocus();
  });

  it("takes the button labels as props", async () => {
    const user = userEvent.setup();
    render(
      <PasswordInput
        label="Passord"
        name="password"
        showPasswordLabel="Vis passord"
        hidePasswordLabel="Skjul passord"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Vis passord" }));
    expect(screen.getByRole("button", { name: "Skjul passord" })).toBeInTheDocument();
  });

  it("does not leak the label props onto the input", () => {
    render(<PasswordInput label="Password" name="password" showPasswordLabel="Show" />);
    expect(screen.getByLabelText("Password")).not.toHaveAttribute("showPasswordLabel");
  });

  it("adds a className alongside its own classes", () => {
    render(<PasswordInput label="Password" name="password" className="mt-2" />);
    expect(screen.getByLabelText("Password")).toHaveClass("mt-2", "rounded-input", "pr-10");
  });

  it("keeps its own id even when the caller passes other attributes", () => {
    render(<PasswordInput label="Password" id="pw" name="password" autoComplete="current-password" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("id", "pw");
    expect(input).toHaveAttribute("autocomplete", "current-password");
  });

  it("marks a required field", () => {
    render(<PasswordInput label="Password" name="password" required />);
    const input = screen.getByLabelText(/Password/);
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-required", "true");
  });

  it("shows the error", () => {
    render(<PasswordInput label="Password" name="password" error="Too short" />);
    expect(screen.getByText("Too short")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveClass("border-input-border-error");
  });
});
