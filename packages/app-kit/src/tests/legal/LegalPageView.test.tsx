import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LegalPageView } from "../../legal";

const page = { key: "terms", locale: "no", title: "Vilkår for bruk", bodyMarkdown: "## Kjøp\n\nAlt er **lov**.", updatedAt: "2026-03-05T10:00:00Z" };

describe("LegalPageView", () => {
  it("shows the page's title, its date in the locale, the Markdown body and a link home", () => {
    render(<LegalPageView page={page} title="Vilkår" homeHref="/no" dateLocale="nb-NO" strings={{ updated: "Sist oppdatert", toFrontPage: "Til forsiden" }} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Vilkår for bruk");
    expect(screen.getByText("Sist oppdatert: 5. mars 2026")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Kjøp");
    expect(screen.getByText("lov").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "← Til forsiden" })).toHaveAttribute("href", "/no");
  });

  it("shows the fallback title and says the page is missing when nobody wrote it", () => {
    render(<LegalPageView page={null} title="Privacy" homeHref="/" dateLocale="en-GB" />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Privacy");
    expect(screen.getByText("This content has not been written yet.")).toBeInTheDocument();
    expect(screen.queryByText(/Last updated/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← Back to the front page" })).toHaveAttribute("href", "/");
  });

  it("writes the date in English for an English page", () => {
    render(<LegalPageView page={page} title="x" homeHref="/en" dateLocale="en-GB" />);

    expect(screen.getByText("Last updated: 5 March 2026")).toBeInTheDocument();
  });
});
