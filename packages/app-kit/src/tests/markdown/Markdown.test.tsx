import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "../../markdown";

describe("Markdown", () => {
  it.each(["", null, undefined])("renders nothing for %j", text => {
    const { container } = render(<Markdown className="prose">{text}</Markdown>);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders emphasis, lists and GitHub tables", () => {
    const { container } = render(
      <Markdown>{"Hello **world** and *you*\n\n- one\n- two\n\n1. first\n\n| A | B |\n| - | - |\n| 1 | 2 |"}</Markdown>,
    );
    expect(screen.getByText("world").tagName).toBe("STRONG");
    expect(screen.getByText("you").tagName).toBe("EM");
    expect(screen.getByText("one").tagName).toBe("LI");
    expect(screen.getByText("first").closest("ol")).not.toBeNull();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("table").parentElement).toHaveClass("overflow-x-auto");
    expect(screen.getByRole("columnheader", { name: "A" })).toBeInTheDocument();
    expect(container.querySelector("[node]")).toBeNull();
  });

  it("styles each element with the theme tokens", () => {
    render(<Markdown>{"## Heading\n\n**bold** [link](/x) `code`"}</Markdown>);
    expect(screen.getByRole("heading", { name: "Heading" })).toHaveClass("text-markdown-heading");
    expect(screen.getByText("bold")).toHaveClass("text-markdown-strong");
    expect(screen.getByRole("link")).toHaveClass("text-markdown-link", "hover:text-markdown-link-hover");
    expect(screen.getByText("code")).toHaveClass("bg-markdown-code-bg", "text-markdown-code-text");
  });

  it("turns a level one heading into level two, since the page has its own h1", () => {
    render(<Markdown>{"# Title"}</Markdown>);
    expect(screen.getByRole("heading", { name: "Title" }).tagName).toBe("H2");
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("renders bare elements, or wraps them when given a class", () => {
    const bare = render(<Markdown>{"a\n\nb"}</Markdown>);
    expect([...bare.container.children].map(e => e.tagName)).toEqual(["P", "P"]);
    bare.unmount();

    const wrapped = render(<Markdown className="space-y-4">{"a\n\nb"}</Markdown>);
    expect(wrapped.container.children).toHaveLength(1);
    expect(wrapped.container.firstElementChild).toHaveClass("space-y-4");
    expect(wrapped.container.firstElementChild!.children).toHaveLength(2);
  });

  it("takes an app's own element for a tag", () => {
    render(<Markdown components={{ p: ({ children }) => <p className="text-xs">{children}</p> }}>{"hi **there**"}</Markdown>);
    expect(screen.getByText("hi", { exact: false })).toHaveClass("text-xs");
    expect(screen.getByText("there")).toHaveClass("text-markdown-strong");
  });

  it("gives an app's element the props without node, so spreading them adds no stray attribute", () => {
    const { container } = render(<Markdown components={{ p: props => <p data-own="" {...props} /> }}>{"hi"}</Markdown>);
    expect(container.querySelector("p[data-own]")).not.toBeNull();
    expect(container.querySelector("[node]")).toBeNull();
  });

  it("keeps links in the same tab by default", () => {
    render(<Markdown>{"[docs](https://example.com)"}</Markdown>);
    const link = screen.getByRole("link", { name: "docs" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).not.toHaveAttribute("target");
  });

  it("opens links to other sites in a new tab when asked, without opener or referrer", () => {
    render(<Markdown externalLinks>{"[docs](https://example.com) [plain](http://example.com) [shop](/shop) [top](#top)"}</Markdown>);
    for (const name of ["docs", "plain"]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("target", "_blank");
      expect(screen.getByRole("link", { name })).toHaveAttribute("rel", "noopener noreferrer");
    }
    for (const name of ["shop", "top"]) {
      expect(screen.getByRole("link", { name })).not.toHaveAttribute("target");
      expect(screen.getByRole("link", { name })).not.toHaveAttribute("rel");
    }
    expect(screen.getByRole("link", { name: "docs" })).toHaveClass("text-markdown-link");
  });

  it("opens external links in a new tab with an app's own link element too", () => {
    render(
      <Markdown externalLinks components={{ a: props => <a className="text-sky-400" href={props.href} target={props.target} rel={props.rel}>{props.children}</a> }}>
        {"[docs](https://example.com)"}
      </Markdown>,
    );
    const link = screen.getByRole("link", { name: "docs" });
    expect(link).toHaveClass("text-sky-400");
    expect(link).toHaveAttribute("target", "_blank");
  });
});

describe("Markdown sanitizing", () => {
  it.each([
    ["a script tag", "safe <script>alert(1)</script> after", "script"],
    ["an image with an error handler", '<img src="x" onerror="alert(1)">', "img[onerror]"],
    ["an iframe", '<iframe src="https://evil.example"></iframe>', "iframe"],
    ["a style tag", "<style>body{display:none}</style>", "style"],
    ["an inline style", '<p style="position:fixed">x</p>', "[style]"],
    ["a form", '<form action="https://evil.example"><input name="pw"></form>', "form, input"],
  ])("drops %s", (_name, text, selector) => {
    const { container } = render(<Markdown>{text}</Markdown>);
    expect(container.querySelector(selector)).toBeNull();
  });

  it.each([
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "vbscript:msgbox(1)",
    "data:text/html,<script>alert(1)</script>",
  ])("never links to %s", href => {
    const { container } = render(<Markdown>{`[click](${href}) <a href="${href}">raw</a>`}</Markdown>);
    for (const a of container.querySelectorAll("a")) {
      expect(a.getAttribute("href") ?? "").not.toMatch(/^(javascript|vbscript|data):/i);
    }
  });

  it("never shows an image from a javascript URL", () => {
    const { container } = render(<Markdown>{"![x](javascript:alert(1))"}</Markdown>);
    for (const img of container.querySelectorAll("img")) {
      expect(img.getAttribute("src") ?? "").not.toMatch(/^javascript:/i);
    }
  });

  it("prefixes ids, so text cannot take over an id the page uses", () => {
    const { container } = render(<Markdown>{"Note[^1]\n\n[^1]: Footnote"}</Markdown>);
    const ids = [...container.querySelectorAll("[id]")].map(e => e.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every(id => id.startsWith("user-content-"))).toBe(true);
  });
});

describe("the entry point", () => {
  it("works in a server component, so it carries no use client", () => {
    const source = readFileSync(join(__dirname, "../../markdown/Markdown.tsx"), "utf8");
    expect(source).not.toContain('"use client"');
  });
});
