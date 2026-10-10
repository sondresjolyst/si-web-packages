import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotFoundState, defaultNotFoundStrings } from "../../ui";

describe("NotFoundState", () => {
  it("explains the missing page in its heading", () => {
    render(<NotFoundState homeHref="/" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(defaultNotFoundStrings.body);
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("links to the front page", () => {
    render(<NotFoundState homeHref="/no" />);
    expect(screen.getByRole("link", { name: defaultNotFoundStrings.home })).toHaveAttribute("href", "/no");
  });

  it("takes the app's own words, keeping the defaults for the rest", () => {
    render(<NotFoundState homeHref="/no" strings={{ body: "Denne siden finnes ikke.", home: "Til forsiden" }} />);
    expect(screen.getByRole("heading")).toHaveTextContent("Denne siden finnes ikke.");
    expect(screen.getByRole("link", { name: "Til forsiden" })).toBeInTheDocument();
    expect(screen.getByText(defaultNotFoundStrings.code)).toBeInTheDocument();
  });

  it("is placed by the class it is given", () => {
    const { container } = render(<NotFoundState homeHref="/" className="py-24" />);
    expect(container.firstChild).toHaveClass("py-24", "flex");
  });

  it("works in a server component, so it carries no use client", () => {
    const source = readFileSync(join(__dirname, "../../ui/NotFoundState.tsx"), "utf8");
    expect(source).not.toContain('"use client"');
  });
});
