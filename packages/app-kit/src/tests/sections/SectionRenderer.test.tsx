import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  SectionRenderer,
  createContactRenderer,
  createImageRenderer,
  createTextRenderer,
  type BaseSection,
  type ImageSection,
  type SectionImageProps,
  type SectionLinkProps,
  type Sections,
} from "../../sections";

type Section = Sections;

const hero: Section = { id: "h", type: "hero", visible: true, heading: "Big\nheading", subheading: "Sub", primaryLabel: "Book", primaryHref: "#contact", secondaryLabel: "Results", secondaryHref: "/runs" };
const image = (changes: Partial<ImageSection> = {}): Section => ({ id: "i", type: "image", visible: true, imageId: "abc", alt: "A car", caption: "On the dyno", layout: "standard", text: "", ...changes });

describe("SectionRenderer defaults", () => {
  it("renders the hero with its heading and both buttons", () => {
    render(<SectionRenderer section={hero} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Big heading");
    expect(screen.getByText("Sub")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book" })).toHaveAttribute("href", "#contact");
    expect(screen.getByRole("link", { name: "Results" })).toHaveAttribute("href", "/runs");
  });

  it("leaves out the hero's empty subheading and buttons, and falls back to # for an empty link", () => {
    render(<SectionRenderer section={{ ...hero, subheading: "", secondaryLabel: "", primaryHref: "" }} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Book" })).toHaveAttribute("href", "#");
  });

  it("renders a feature's non-empty bullets", () => {
    render(<SectionRenderer section={{ id: "f", type: "feature", visible: true, heading: "Dyno", text: "Measured", bullets: ["Power", "", "Torque"] }} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Dyno");
    expect(screen.getAllByRole("listitem").map(li => li.textContent)).toEqual(["Power", "Torque"]);
  });

  it("renders a text section's body as Markdown", () => {
    render(<SectionRenderer section={{ id: "t", type: "text", visible: true, heading: "About", body: "Some **bold** text" }} />);
    expect(screen.getByText("bold").tagName).toBe("STRONG");
  });

  it("renders the contact anchor with no form by default", () => {
    const { container } = render(<SectionRenderer section={{ id: "c", type: "contact", visible: true, heading: "Talk", text: "Write us" }} />);
    expect(container.querySelector("section#contact")).toHaveClass("bg-gray-50");
    expect(container.querySelector("form")).toBeNull();
  });

  it("renders the call to action with its button", () => {
    render(<SectionRenderer section={{ id: "a", type: "cta", visible: true, heading: "Ready?", text: "", primaryLabel: "Go", primaryHref: "/go" }} />);
    expect(screen.getByRole("link", { name: "Go" })).toHaveAttribute("href", "/go");
  });

  it("renders an image through ContentImage, with the intrinsic size where the layout keeps the ratio", () => {
    render(<SectionRenderer section={image()} context={{ imageDimensions: { abc: { width: 800, height: 600 } } }} />);
    const img = screen.getByRole("img", { name: "A car" });
    expect(img).toHaveAttribute("src", "/content-images/abc");
    expect(img).toHaveAttribute("width", "800");
    expect(img).toHaveClass("h-auto");
    expect(screen.getByText("On the dyno").tagName).toBe("FIGCAPTION");
  });

  it.each(["full", "overlay", "overlayFull"] as const)("passes no intrinsic size in the %s layout", layout => {
    render(<SectionRenderer section={image({ layout, text: "Over" })} context={{ imageDimensions: { abc: { width: 800, height: 600 } } }} />);
    expect(screen.getByRole("img")).not.toHaveAttribute("width");
  });

  it("shows the text over the image in the overlay layouts, and none when the text is empty", () => {
    const { rerender } = render(<SectionRenderer section={image({ layout: "overlay", text: "Over" })} />);
    expect(screen.getByText("Over")).toBeInTheDocument();
    rerender(<SectionRenderer section={image({ layout: "overlayFull", text: "" })} />);
    expect(screen.queryByText("Over")).toBeNull();
    expect(document.querySelector('[class~="bg-black/40"]')).toBeNull();
  });

  it("orders the image second in the right layout", () => {
    render(<SectionRenderer section={image({ layout: "right", text: "Beside" })} />);
    expect(screen.getByRole("img")).toHaveClass("sm:order-2");
    expect(screen.getByText("Beside")).toBeInTheDocument();
  });

  it("leaves out the caption when it is empty", () => {
    const { container } = render(<SectionRenderer section={image({ caption: "" })} />);
    expect(container.querySelector("figcaption")).toBeNull();
  });

  it("renders nothing for an image section with no image", () => {
    const { container } = render(<SectionRenderer section={image({ imageId: null })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a hidden section", () => {
    const { container } = render(<SectionRenderer section={{ ...hero, visible: false }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for feed and stats until the app registers them", () => {
    const { container } = render(
      <>
        <SectionRenderer section={{ id: "f", type: "feed", visible: true, heading: "Runs", limit: 3 }} />
        <SectionRenderer section={{ id: "s", type: "stats", visible: true, heading: "", items: [] }} />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders on the server", () => {
    expect(renderToStaticMarkup(<SectionRenderer section={hero} />)).toContain("<h1");
  });
});

describe("SectionRenderer registry and context", () => {
  it("lets an app replace a shared renderer", () => {
    render(<SectionRenderer section={hero} renderers={{ hero: section => <p>Custom {section.heading}</p> }} />);
    expect(screen.getByText("Custom Big heading")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("renders the app's own section type through its renderer", () => {
    type Banner = BaseSection<"banner"> & { message: string };
    const banner: Section | Banner = { id: "b", type: "banner", visible: true, message: "Closed today" };
    render(<SectionRenderer<Section | Banner> section={banner} renderers={{ banner: section => <aside>{section.message}</aside> }} />);
    expect(screen.getByText("Closed today").tagName).toBe("ASIDE");
  });

  it("maps button links through href and draws them with the app's Link", () => {
    const Link = ({ href, children }: SectionLinkProps) => <a href={href} data-app-link>{children}</a>;
    render(<SectionRenderer section={hero} context={{ href: path => `/no${path}`, Link }} />);
    const link = screen.getByRole("link", { name: "Results" });
    expect(link).toHaveAttribute("href", "/no/runs");
    expect(link).toHaveAttribute("data-app-link");
    expect(screen.getByRole("link", { name: "Book" })).toHaveAttribute("href", "/no#contact");
  });

  it("maps the call to action's button through href", () => {
    render(<SectionRenderer section={{ id: "a", type: "cta", visible: true, heading: "Ready?", text: "", primaryLabel: "Go", primaryHref: "/go" }} context={{ href: path => `/no${path}` }} />);
    expect(screen.getByRole("link", { name: "Go" })).toHaveAttribute("href", "/no/go");
  });

  it("draws images with the app's Image, and drops the intrinsic size and h-auto when asked", () => {
    const Image = ({ imageId, alt, className, width }: SectionImageProps) => <img src={`https://cdn.test/${imageId}`} alt={alt} className={className} data-width={width ?? "none"} />;
    render(<SectionRenderer section={image({ layout: "left" })} renderers={{ image: createImageRenderer({ intrinsicSize: false }) }} context={{ Image, imageDimensions: { abc: { width: 800, height: 600 } } }} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://cdn.test/abc");
    expect(img).toHaveAttribute("data-width", "none");
    expect(img.className).toBe("w-full rounded-2xl ");
  });

  it("takes the text body classes and the contact form and classes as options", () => {
    const textSection: Section = { id: "t", type: "text", visible: true, heading: "", body: "Hi" };
    const contactSection: Section = { id: "c", type: "contact", visible: true, heading: "", text: "" };
    const { container } = render(
      <>
        <SectionRenderer section={textSection} renderers={{ text: createTextRenderer({ bodyClassName: "prose" }) }} />
        <SectionRenderer
          section={contactSection}
          renderers={{ contact: createContactRenderer({ form: <form aria-label="Contact" />, className: "scroll-mt-20" }) }}
        />
      </>,
    );
    expect(screen.getByText("Hi").parentElement).toHaveClass("prose");
    expect(container.querySelector("section#contact")).toHaveClass("scroll-mt-20");
    expect(screen.getByRole("form", { name: "Contact" })).toBeInTheDocument();
  });

  it("keeps a default when the context passes undefined for it", () => {
    render(<SectionRenderer section={hero} context={{ href: undefined as unknown as (p: string) => string }} />);
    expect(screen.getByRole("link", { name: "Results" })).toHaveAttribute("href", "/runs");
  });
});

describe("SectionRenderer long words", () => {
  const long = "Supercalifragilistic".repeat(4);
  const wrapped = (el: HTMLElement | null) => expect(el).toHaveClass("wrap-anywhere");
  const broken = (el: HTMLElement | null) => {
    expect(el).toHaveClass("break-words");
    expect(el).not.toHaveClass("wrap-anywhere");
  };

  it("breaks a long word in the hero, and keeps the heading on break-words so a short word never splits", () => {
    render(<SectionRenderer section={{ ...hero, heading: long, subheading: long, primaryLabel: long, secondaryLabel: long }} />);
    broken(screen.getByRole("heading", { level: 1 }));
    wrapped(screen.getAllByText(long).find(el => el.tagName === "P") ?? null);
    for (const link of screen.getAllByRole("link")) wrapped(link);
  });

  it("breaks a long word in the feature heading, text and bullets", () => {
    render(<SectionRenderer section={{ id: "f", type: "feature", visible: true, heading: long, text: long, bullets: [long] }} />);
    broken(screen.getByRole("heading", { level: 2 }));
    wrapped(screen.getAllByText(long).find(el => el.tagName === "P") ?? null);
    wrapped(screen.getByRole("listitem"));
  });

  it("breaks a long word in the text section heading", () => {
    render(<SectionRenderer section={{ id: "t", type: "text", visible: true, heading: long, body: "text" }} />);
    broken(screen.getByRole("heading", { level: 2 }));
  });

  it("breaks a long word in the contact heading and text", () => {
    render(<SectionRenderer section={{ id: "c", type: "contact", visible: true, heading: long, text: long }} />);
    broken(screen.getByRole("heading", { level: 2 }));
    wrapped(screen.getAllByText(long).find(el => el.tagName === "P") ?? null);
  });

  it("breaks a long word in the call to action, and lets its text column shrink", () => {
    render(<SectionRenderer section={{ id: "a", type: "cta", visible: true, heading: long, text: long, primaryLabel: long, primaryHref: "/go" }} />);
    const heading = screen.getByRole("heading", { level: 2 });
    broken(heading);
    expect(heading.parentElement).toHaveClass("min-w-0");
    wrapped(screen.getAllByText(long).find(el => el.tagName === "P") ?? null);
    wrapped(screen.getByRole("link"));
  });

  it.each([
    ["caption", { caption: long }],
    ["side text", { layout: "left", text: long }],
    ["overlay text", { layout: "overlay", text: long }],
    ["full overlay text", { layout: "overlayFull", text: long }],
  ] as const)("breaks a long word in the image %s", (_, changes) => {
    render(<SectionRenderer section={image(changes)} />);
    wrapped(screen.getByText(long));
  });
});
