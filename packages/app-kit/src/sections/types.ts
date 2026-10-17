// Plain types, with no "use client", so a server component can import them.

/** The fields every section has. `type` picks the renderer and the editor. */
export interface BaseSection<T extends string = string> {
  id: string;
  type: T;
  visible: boolean;
}

/** The page's opening band, with a heading and up to two buttons. */
export interface HeroSection extends BaseSection<"hero"> {
  heading: string;
  subheading: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}

/** A card with a heading, a short text and a list of ticked bullets. */
export interface FeatureSection extends BaseSection<"feature"> {
  heading: string;
  text: string;
  bullets: string[];
}

/** A heading and a Markdown body. */
export interface TextSection extends BaseSection<"text"> {
  heading: string;
  body: string;
}

/** A list of the app's latest items. The app registers its renderer, since only it knows the items. */
export interface FeedSection extends BaseSection<"feed"> {
  heading: string;
  limit: number;
}

/** A heading and a text above the app's contact form. */
export interface ContactSection extends BaseSection<"contact"> {
  heading: string;
  text: string;
}

/** A band with a heading, a text and one button. */
export interface CtaSection extends BaseSection<"cta"> {
  heading: string;
  text: string;
  primaryLabel: string;
  primaryHref: string;
}

/** One number in a stats band. `static` shows `value`. Any other source is a live number the app looks up. */
export interface StatItem<Live extends string = never> {
  source: "static" | Live;
  value: string;
  label: string;
}

/** A band of numbers. The app registers its renderer, since only it can look up the live numbers. */
export interface StatsSection<Live extends string = never> extends BaseSection<"stats"> {
  heading: string;
  items: StatItem<Live>[];
}

export type ImageLayout = "standard" | "full" | "left" | "right" | "overlay" | "overlayFull";

/** An uploaded image in one of the layouts, with a caption or a text. */
export interface ImageSection extends BaseSection<"image"> {
  imageId: string | null;
  alt: string;
  caption: string;
  layout: ImageLayout;
  text: string;
}

/** The section types the library knows. */
export type SharedSectionType = "hero" | "feature" | "text" | "feed" | "contact" | "cta" | "stats" | "image";

/** Every shared section type, in the order the editor offers them. */
export const SHARED_SECTION_TYPES: readonly SharedSectionType[] = ["hero", "feature", "text", "feed", "contact", "cta", "stats", "image"];

/** The extra fields an app adds to a shared section, by type. */
export type SectionExtensions = { [K in SharedSectionType]?: object };

type Extra<E extends SectionExtensions, K extends SharedSectionType> = E[K] extends object ? E[K] : unknown;

/**
 * The union of the shared sections, each with the app's extra fields. `Live` names the live
 * sources a stats item can show. An app with its own section types adds them to the union.
 *
 * ```ts
 * type Section = Sections<{ hero: { backgroundImageId: string | null } }, "builds" | "parts">;
 * ```
 */
export type Sections<E extends SectionExtensions = Record<never, never>, Live extends string = never> =
  | (HeroSection & Extra<E, "hero">)
  | (FeatureSection & Extra<E, "feature">)
  | (TextSection & Extra<E, "text">)
  | (FeedSection & Extra<E, "feed">)
  | (ContactSection & Extra<E, "contact">)
  | (CtaSection & Extra<E, "cta">)
  | (StatsSection<Live> & Extra<E, "stats">)
  | (ImageSection & Extra<E, "image">);

/** The member of a section union with the given type. */
export type SectionOf<S extends BaseSection, K extends S["type"]> = Extract<S, { type: K }>;
