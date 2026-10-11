import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JsonLd } from "../../seo";

describe("JsonLd", () => {
  it("renders nothing without nodes", () => {
    const { container } = render(<JsonLd nodes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one JSON-LD script with the graph", () => {
    const { container } = render(<JsonLd nodes={[{ "@type": "Thing", name: "A" }]} />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0].textContent!)).toEqual({ "@context": "https://schema.org", "@graph": [{ "@type": "Thing", name: "A" }] });
  });

  it("cannot be closed early by text in a node", () => {
    const { container } = render(<JsonLd nodes={[{ "@type": "Thing", name: "</script><img src=x onerror=alert(1)>" }]} />);
    expect(container.querySelectorAll("script")).toHaveLength(1);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")!.innerHTML).not.toContain("</script");
  });
});

describe("the entry points", () => {
  it("work in a server component, so none carries use client", () => {
    for (const file of ["seo/index.ts", "seo/site.ts", "seo/JsonLd.tsx", "seo/og/index.tsx"]) {
      expect(readFileSync(join(__dirname, "../..", file), "utf8"), file).not.toContain('"use client"');
    }
  });

  it("keep next/og out of /seo, so a page using it does not bundle the image renderer", () => {
    for (const file of ["seo/index.ts", "seo/site.ts", "seo/JsonLd.tsx", "seo/schema.ts", "seo/sitemap.ts", "seo/environment.ts"]) {
      expect(readFileSync(join(__dirname, "../..", file), "utf8"), file).not.toContain("next/og");
    }
  });
});
