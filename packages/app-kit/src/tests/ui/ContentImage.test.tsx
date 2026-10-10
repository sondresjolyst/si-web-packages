import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CONTENT_IMAGE_WIDTHS, ContentImage, contentImagePath, contentImageSrcSet } from "../../ui";

describe("contentImagePath and contentImageSrcSet", () => {
  it("point at the content images rewrite", () => {
    expect(contentImagePath("abc")).toBe("/content-images/abc");
    expect(contentImagePath("abc", "/img")).toBe("/img/abc");
  });

  it("encode the id, so it stays one path segment", () => {
    expect(contentImagePath("../a b?c")).toBe("/content-images/..%2Fa%20b%3Fc");
  });

  it("list every width the API serves", () => {
    expect(CONTENT_IMAGE_WIDTHS).toEqual([384, 640, 768, 1024, 1366, 1600]);
    expect(contentImageSrcSet("abc")).toBe(
      "/content-images/abc?w=384 384w, /content-images/abc?w=640 640w, /content-images/abc?w=768 768w, " +
        "/content-images/abc?w=1024 1024w, /content-images/abc?w=1366 1366w, /content-images/abc?w=1600 1600w",
    );
  });

  it("take other widths and another path", () => {
    expect(contentImageSrcSet("abc", [100, 200], "/img")).toBe("/img/abc?w=100 100w, /img/abc?w=200 200w");
  });
});

describe("ContentImage", () => {
  it("offers every rendition of an uploaded image", () => {
    render(<ContentImage imageId="abc" alt="Gaming PC" sizes="400px" />);
    const image = screen.getByAltText("Gaming PC");
    expect(image).toHaveAttribute("src", "/content-images/abc");
    expect(image).toHaveAttribute("srcset", contentImageSrcSet("abc"));
    expect(image).toHaveAttribute("sizes", "400px");
  });

  it("takes another path and other widths", () => {
    render(<ContentImage imageId="abc" alt="Photo" sizes="400px" base="/img" widths={[100]} />);
    const image = screen.getByAltText("Photo");
    expect(image).toHaveAttribute("src", "/img/abc");
    expect(image).toHaveAttribute("srcset", "/img/abc?w=100 100w");
  });

  it("defers loading until an image nears the viewport", () => {
    render(<ContentImage imageId="abc" alt="Gaming PC" sizes="400px" />);
    const image = screen.getByAltText("Gaming PC");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("decoding", "async");
    expect(image).not.toHaveAttribute("fetchpriority");
  });

  it("loads the above-the-fold image eagerly and at high priority", () => {
    render(<ContentImage imageId="abc" alt="Hero" sizes="100vw" priority />);
    const image = screen.getByAltText("Hero");
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
    expect(image).toHaveAttribute("decoding", "sync");
  });

  it.each([null, ""])("serves the static fallback as it is when the id is %j", imageId => {
    render(<ContentImage imageId={imageId} fallbackSrc="/hero.jpg" alt="" sizes="100vw" />);
    const image = document.querySelector("img")!;
    expect(image).toHaveAttribute("src", "/hero.jpg");
    expect(image).not.toHaveAttribute("srcset");
    expect(image).not.toHaveAttribute("sizes");
  });

  it("renders nothing when there is neither an image nor a fallback", () => {
    const { container } = render(<ContentImage imageId={null} alt="" sizes="100vw" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("passes on its class and hides a decorative image from assistive technology", () => {
    render(<ContentImage imageId="abc" alt="" sizes="100vw" className="object-cover" aria-hidden />);
    const image = document.querySelector("img")!;
    expect(image).toHaveClass("object-cover");
    expect(image).toHaveAttribute("aria-hidden", "true");
  });

  it("reserves the image space when the intrinsic size is known", () => {
    render(<ContentImage imageId="abc" alt="Photo" sizes="640px" width={1600} height={900} />);
    const image = screen.getByAltText("Photo");
    expect(image).toHaveAttribute("width", "1600");
    expect(image).toHaveAttribute("height", "900");
  });

  it("renders without dimensions rather than guessing them", () => {
    render(<ContentImage imageId="abc" alt="Photo" sizes="640px" />);
    const image = screen.getByAltText("Photo");
    expect(image).not.toHaveAttribute("width");
    expect(image).not.toHaveAttribute("height");
  });

  it("works in a server component, so it carries no use client", () => {
    const source = readFileSync(join(__dirname, "../../ui/ContentImage.tsx"), "utf8");
    expect(source).not.toContain('"use client"');
  });
});
