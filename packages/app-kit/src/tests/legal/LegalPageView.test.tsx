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

  it("leaves out a date it cannot read, and still shows the page", () => {
    render(<LegalPageView page={{ ...page, updatedAt: "not a date" }} title="x" homeHref="/" dateLocale="en-GB" />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Vilkår for bruk");
    expect(screen.queryByText(/Last updated/)).not.toBeInTheDocument();
  });

  it("writes the date in English for an English page", () => {
    render(<LegalPageView page={page} title="x" homeHref="/en" dateLocale="en-GB" />);

    expect(screen.getByText("Last updated: 5 March 2026")).toBeInTheDocument();
  });

  it.each([
    ["the page's title", page],
    ["the fallback title", null],
  ])("breaks a long word in %s, and keeps it on break-words so a short word never splits", (_, value) => {
    const long = "Supercalifragilistic".repeat(4);
    render(<LegalPageView page={value && { ...value, title: long }} title={long} homeHref="/" dateLocale="en-GB" />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(long);
    expect(heading).toHaveClass("break-words");
    expect(heading).not.toHaveClass("wrap-anywhere");
  });
});
