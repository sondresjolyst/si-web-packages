// No "use client" and no hooks, so a server component can render the sections.

import { CheckIcon } from "@heroicons/react/24/outline";
import type { ComponentType, ReactNode } from "react";
import { Markdown } from "../markdown/Markdown";
import { ContentImage } from "../ui/ContentImage";
import { SmartLink } from "./SmartLink";
import type { BaseSection, ContactSection, CtaSection, FeatureSection, HeroSection, ImageSection, SectionOf, TextSection } from "./types";

/** What a section renderer gets to draw an image. */
export interface SectionImageProps {
  imageId: string;
  alt: string;
  /** The widths the image is shown at, for a responsive image. A plain image may ignore it. */
  sizes: string;
  className: string;
  /** The intrinsic size, only where the image keeps its own ratio. */
  width?: number | undefined;
  height?: number | undefined;
}

/** What a link in a section gets. */
export interface SectionLinkProps {
  href: string;
  className?: string | undefined;
  children: ReactNode;
}

/** Intrinsic image sizes by image id. */
export type ImageDimensions = Record<string, { width: number; height: number }>;

/** The app's pieces the renderers draw with. */
export interface SectionRenderContext {
  /** Turns a button's path into the link it points at, such as one with the locale in front. Defaults to the path as it is. */
  href: (path: string) => string;
  /** The link for buttons. Defaults to `SmartLink`. */
  Link: ComponentType<SectionLinkProps>;
  /** The image for image sections. Defaults to `ContentImage`. */
  Image: ComponentType<SectionImageProps>;
  /** Intrinsic sizes by image id, for the image layouts that keep the image's ratio. */
  imageDimensions: ImageDimensions;
}

/** Draws one section type. */
export type SectionRenderFn<S> = (section: S, context: SectionRenderContext) => ReactNode;

/** A renderer per section type. An app's renderers replace the defaults for the same type. */
export type SectionRenderers<S extends BaseSection> = {
  [K in S["type"]]?: SectionRenderFn<SectionOf<S, K>>;
};

function ScrimText({ text, big }: { text: string; big?: boolean }) {
  if (!text) return null;
  return (
    <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-6">
      <p className={`text-white font-black text-center whitespace-pre-line ${big ? "text-3xl sm:text-5xl max-w-3xl" : "text-2xl sm:text-4xl max-w-2xl"}`}>{text}</p>
    </div>
  );
}

/** The plain hero: the heading and the buttons on the primary color. */
export const heroRenderer: SectionRenderFn<HeroSection> = (section, { href, Link }) => (
  <section className="bg-primary">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
      <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-primary-foreground max-w-3xl whitespace-pre-line">{section.heading}</h1>
      {section.subheading && <p className="mt-5 text-lg text-primary-foreground/80 max-w-xl whitespace-pre-line">{section.subheading}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        {section.primaryLabel && (
          <Link href={href(section.primaryHref || "#")} className="rounded-lg bg-gray-900 text-white font-semibold px-6 py-3 hover:bg-gray-800 transition">
            {section.primaryLabel}
          </Link>
        )}
        {section.secondaryLabel && (
          <Link href={href(section.secondaryHref || "#")} className="rounded-lg bg-white text-gray-900 font-semibold px-6 py-3 hover:bg-gray-100 transition">
            {section.secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  </section>
);

/** A card with the ticked bullets. Empty bullets are left out. */
export const featureRenderer: SectionRenderFn<FeatureSection> = section => (
  <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
    {section.heading && <h2 className="text-2xl font-bold text-gray-900 mb-6">{section.heading}</h2>}
    <div className="w-full sm:max-w-md rounded-2xl border border-gray-200 p-6">
      {section.text && <p className="text-sm text-gray-600">{section.text}</p>}
      <ul className="mt-4 space-y-2">
        {section.bullets.filter(Boolean).map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
            <CheckIcon className="h-4 w-4 text-gray-900 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  </section>
);

/** Options for `createTextRenderer`. */
export interface TextRendererOptions {
  /** The classes on the element around the Markdown body. Defaults to `space-y-4 text-gray-700`. */
  bodyClassName?: string | undefined;
}

/** The heading and the Markdown body. */
export function createTextRenderer({ bodyClassName = "space-y-4 text-gray-700" }: TextRendererOptions = {}): SectionRenderFn<TextSection> {
  return section => (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      {section.heading && <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.heading}</h2>}
      <div className={bodyClassName}>
        <Markdown>{section.body}</Markdown>
      </div>
    </section>
  );
}

/** Options for `createContactRenderer`. */
export interface ContactRendererOptions {
  /** The app's contact form, shown below the heading and the text. */
  form?: ReactNode;
  /** The classes on the section, which has the id `contact`. Defaults to `bg-gray-50 border-t border-gray-200`. */
  className?: string | undefined;
}

/** The heading and the text above the app's contact form, as the `#contact` anchor. */
export function createContactRenderer({ form = null, className = "bg-gray-50 border-t border-gray-200" }: ContactRendererOptions = {}): SectionRenderFn<ContactSection> {
  return section => (
    <section id="contact" className={className}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        {section.heading && <h2 className="text-2xl font-bold text-gray-900">{section.heading}</h2>}
        {section.text && <p className="mt-1 text-sm text-gray-600 mb-6">{section.text}</p>}
        {form}
      </div>
    </section>
  );
}

/** The band with a heading and one button, on the primary color. */
export const ctaRenderer: SectionRenderFn<CtaSection> = (section, { href, Link }) => (
  <section className="bg-primary">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-primary-foreground whitespace-pre-line">{section.heading}</h2>
        {section.text && <p className="mt-2 text-primary-foreground/80 whitespace-pre-line">{section.text}</p>}
      </div>
      {section.primaryLabel && (
        <Link href={href(section.primaryHref || "#")} className="shrink-0 rounded-lg bg-gray-900 text-white font-semibold px-6 py-3 hover:bg-gray-800 transition">
          {section.primaryLabel}
        </Link>
      )}
    </div>
  </section>
);

/** Options for `createImageRenderer`. */
export interface ImageRendererOptions {
  /**
   * Whether the layouts that keep the image's ratio (standard, left and right) pass the intrinsic
   * size from `imageDimensions` and add `h-auto`, so the browser reserves the space. Defaults to true.
   */
  intrinsicSize?: boolean | undefined;
}

/** An uploaded image in its layout. Nothing renders without an image. */
export function createImageRenderer({ intrinsicSize = true }: ImageRendererOptions = {}): SectionRenderFn<ImageSection> {
  return (section, { Image, imageDimensions }) => {
    if (section.imageId == null) return null;
    const layout = section.layout ?? "standard";
    const intrinsic = intrinsicSize ? imageDimensions[section.imageId] : undefined;
    const size = intrinsicSize ? { width: intrinsic?.width, height: intrinsic?.height } : {};
    const auto = intrinsicSize ? " h-auto" : "";

    if (layout === "full") {
      return (
        <section className="py-8">
          <Image imageId={section.imageId} alt={section.alt} sizes="100vw" className="w-full max-h-[70vh] object-cover" />
        </section>
      );
    }

    if (layout === "overlay") {
      return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="relative rounded-2xl overflow-hidden">
            <Image imageId={section.imageId} alt={section.alt} sizes="(max-width: 1280px) 100vw, 1280px" className="w-full h-[420px] object-cover" />
            <ScrimText text={section.text} />
          </div>
        </section>
      );
    }

    if (layout === "overlayFull") {
      return (
        <section className="relative">
          <Image imageId={section.imageId} alt={section.alt} sizes="100vw" className="w-full h-[480px] object-cover" />
          <ScrimText text={section.text} big />
        </section>
      );
    }

    if (layout === "left" || layout === "right") {
      return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid sm:grid-cols-2 gap-8 items-center">
            <Image
              imageId={section.imageId}
              alt={section.alt}
              sizes="(max-width: 640px) 100vw, 640px"
              {...size}
              className={`w-full${auto} rounded-2xl ${layout === "right" ? "sm:order-2" : ""}`}
            />
            {section.text && <p className="text-gray-700 leading-relaxed whitespace-pre-line">{section.text}</p>}
          </div>
        </section>
      );
    }

    return (
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <figure>
          <Image imageId={section.imageId} alt={section.alt} sizes="(max-width: 1024px) 100vw, 1024px" {...size} className={`w-full${auto} rounded-2xl`} />
          {section.caption && <figcaption className="mt-2 text-center text-sm text-gray-500">{section.caption}</figcaption>}
        </figure>
      </section>
    );
  };
}

/**
 * The renderers for the shared types. `feed` and `stats` have none, since only the app knows its
 * items and its live numbers. `contact` renders no form until the app registers one through
 * `createContactRenderer`.
 */
const defaultSectionRenderers = {
  hero: heroRenderer,
  feature: featureRenderer,
  text: createTextRenderer(),
  contact: createContactRenderer(),
  cta: ctaRenderer,
  image: createImageRenderer(),
};

const defaultContext: SectionRenderContext = {
  href: path => path,
  Link: SmartLink,
  Image: ContentImage,
  imageDimensions: {},
};

/** Props for `SectionRenderer`. */
export interface SectionRendererProps<S extends BaseSection> {
  section: S;
  /** The app's renderers. They replace the defaults for the same type, and add the app's own types. */
  renderers?: SectionRenderers<S> | undefined;
  /** The app's link, image, path mapping and image sizes. Anything left out keeps its default. */
  context?: Partial<SectionRenderContext> | undefined;
}

/**
 * Renders one section through the renderer for its type. A hidden section, or one whose type has
 * no renderer, renders nothing. It holds no state, so it works in a server component.
 */
export function SectionRenderer<S extends BaseSection>({ section, renderers, context }: SectionRendererProps<S>) {
  if (!section.visible) return null;
  const all = { ...defaultSectionRenderers, ...renderers } as unknown as Record<string, SectionRenderFn<S> | undefined>;
  const render = all[section.type];
  if (!render) return null;
  return <>{render(section, { ...defaultContext, ...definedOnly(context) })}</>;
}

function definedOnly(context: Partial<SectionRenderContext> | undefined): Partial<SectionRenderContext> {
  return Object.fromEntries(Object.entries(context ?? {}).filter(([, value]) => value !== undefined));
}
