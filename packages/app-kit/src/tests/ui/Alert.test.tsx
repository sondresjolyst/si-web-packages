import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert } from "../../ui";

describe("Alert", () => {
  it("renders its children as an alert by default", () => {
    render(<Alert>Saved</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Saved");
  });

  it("renders as a status when asked, so a changing text is not announced on every change", () => {
    render(<Alert role="status">3 seconds left</Alert>);
    expect(screen.getByRole("status")).toHaveTextContent("3 seconds left");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("styles by variant", () => {
    render(<Alert variant="error">Failed</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-red-50");
  });

  it("defaults to the info variant", () => {
    render(<Alert>Note</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("bg-gray-50");
  });
});
