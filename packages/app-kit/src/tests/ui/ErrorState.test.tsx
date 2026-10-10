import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorState, defaultErrorStateStrings } from "../../ui";

describe("ErrorState", () => {
  it("says the service is temporarily unavailable", () => {
    render(<ErrorState reset={() => {}} homeHref="/" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(defaultErrorStateStrings.title);
    expect(screen.getByText(defaultErrorStateStrings.body)).toBeInTheDocument();
  });

  it("lets the reader retry without a full reload", async () => {
    const reset = vi.fn();
    render(<ErrorState reset={reset} homeHref="/" />);
    const button = screen.getByRole("button", { name: defaultErrorStateStrings.tryAgain });
    expect(button).toHaveAttribute("type", "button");

    await userEvent.click(button);

    expect(reset).toHaveBeenCalledOnce();
  });

  it("offers a way out to the front page", () => {
    render(<ErrorState reset={() => {}} homeHref="/en" />);
    expect(screen.getByRole("link", { name: defaultErrorStateStrings.home })).toHaveAttribute("href", "/en");
  });

  it("takes the app's own words, keeping the defaults for the rest", () => {
    render(<ErrorState reset={() => {}} homeHref="/no" strings={{ title: "Midlertidig utilgjengelig", tryAgain: "Prøv igjen" }} />);
    expect(screen.getByRole("heading")).toHaveTextContent("Midlertidig utilgjengelig");
    expect(screen.getByRole("button", { name: "Prøv igjen" })).toBeInTheDocument();
    expect(screen.getByText(defaultErrorStateStrings.body)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: defaultErrorStateStrings.home })).toBeInTheDocument();
  });

  it("is placed by the class it is given", () => {
    const { container } = render(<ErrorState reset={() => {}} homeHref="/" className="py-24" />);
    expect(container.firstChild).toHaveClass("py-24", "flex");
  });
});
