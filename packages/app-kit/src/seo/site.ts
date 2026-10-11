import type { Metadata, MetadataRoute } from "next";
import { isIndexableEnvironment } from "./environment";
import { ref, type OrganizationInfo, type SchemaNode } from "./schema";

/** The size of the share image. */
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/** The robots directive for pages that exist for signed-in users only. */
export const NOINDEX: Metadata["robots"] = { index: false, follow: false };

export interface SiteConfig<L extends string> {
  /** The site's name, as in titles, Open Graph and structured data. */
  name: string;
  /** The canonical origin, such as `https://www.example.no`, without a trailing slash. */
  url: string;
  /** Between a page title and the site name, such as `" | "`. */
  titleSeparator: string;
  /** The locale segments every page is under, such as `["no", "en"]`. A site without them omits this. */
  locales?: readonly L[] | undefined;
  /** The locale `x-default` points at. Defaults to the first locale. */
  defaultLocale?: L | undefined;
  /** The BCP 47 tag for each locale, for hreflang and Open Graph. Defaults to the locale itself. */
  localeTags?: Partial<Record<L, string>> | undefined;
  /** The short line under the name, per locale. Used in the default title and the share image's alt text. */
  tagline?: ((locale: L) => string) | undefined;
  /** The share image route below each locale. Defaults to `/og`. */
  shareImagePath?: string | undefined;
}

export interface PageMetadataInput<L extends string> {
  locale: L;
  /** The path below the locale segment, such as `/builds/my-pc`. Omit for the front page. */
  path?: string | undefined;
  /** The page title, without the site name. The root layout's template adds it. */
  title?: string | undefined;
  description?: string | undefined;
  /** Image URLs for the share preview. Defaults to the share image for the locale. */
  images?: string[] | undefined;
}

export interface SiteMetadataInput<L extends string> {
  locale: L;
  description?: string | undefined;
  /** The web app manifest's path, such as `/manifest.json`. */
  manifest?: string | undefined;
}

export interface Crumb {
  name: string;
  /** A site-relative path, such as `/no/builds`. The last crumb is the current page and has none. */
  path?: string | undefined;
}

export interface LocaleEntryOptions<L extends string> {
  /** The locales the page exists in. Defaults to all of them. */
  locales?: readonly L[] | undefined;
  /** When the page last changed, per locale. Left out when unknown. */
  lastModified?: ((locale: L) => Date | undefined) | undefined;
}

export interface RobotsInput {
  /** Paths below each locale segment that must not be crawled, such as `/admin`. */
  privatePaths?: readonly string[] | undefined;
  /** Paths outside the locale segments that must not be crawled, such as `/api/`. */
  privateRootPaths?: readonly string[] | undefined;
  /** Whether search engines may index this deployment. Defaults to `isIndexableEnvironment()`. */
  indexable?: boolean | undefined;
}

export interface OrganizationOptions {
  /** The schema.org type, such as `Organization` or `ComputerStore`. Defaults to `Organization`. */
  type?: string | undefined;
  /** The ISO country code for the address and the area served. Defaults to `NO`. */
  country?: string | undefined;
  /** Site-relative paths of the square image and the logo. Default to `/icon.png` and `/logo.png`. */
  image?: string | undefined;
  logo?: string | undefined;
}

/**
 * One leading slash, no trailing slash. `""` and `"/"` both mean the front page. Leading slashes
 * and backslashes collapse to one, so a path always stays on the site's own host.
 */
export function normalizePath(path: string): string {
  if (path === "") return "";
  const withSlash = `/${path.replace(/^[/\\]+/, "")}`;
  return withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash;
}

/**
 * The URL, metadata, sitemap, robots and structured data helpers for one site, bound to its name,
 * canonical origin and locales.
 */
export function defineSite<L extends string = string>(config: SiteConfig<L>) {
  const locales = config.locales ?? [];
  const defaultLocale = config.defaultLocale ?? locales[0];
  const tag = (locale: L) => config.localeTags?.[locale] ?? locale;
  const shareImagePath = config.shareImagePath ?? "/og";

  /** A site-relative URL for a page in one locale, such as `/no/builds`. A site without locales has no segment. */
  const localePath = (locale: L | undefined, path = ""): string =>
    locale === undefined || locales.length === 0 ? normalizePath(path) || "/" : `/${locale}${normalizePath(path)}`;

  /** An absolute URL on the canonical origin, without a trailing slash. */
  const absoluteUrl = (path = ""): string =>
    new URL(normalizePath(path) || "/", config.url).toString().replace(/\/$/, "") || config.url;

  const absoluteLocaleUrl = (locale: L, path = ""): string => absoluteUrl(localePath(locale, path));

  /** Language alternates by BCP 47 tag. `x-default` points at the default locale. */
  const languageAlternates = (path: string): Record<string, string> => ({
    ...Object.fromEntries(locales.map(l => [tag(l), localePath(l, path)])),
    ...(defaultLocale !== undefined ? { "x-default": localePath(defaultLocale, path) } : {}),
  });

  const fullTitle = (locale: L) => {
    const tagline = config.tagline?.(locale);
    return tagline ? `${config.name}${config.titleSeparator}${tagline}` : config.name;
  };

  const defaultShareImage = (locale: L) => ({
    url: localePath(locale, shareImagePath),
    ...SHARE_IMAGE_SIZE,
    type: "image/png",
    alt: fullTitle(locale),
  });

  /** The canonical URL, hreflang set and Open Graph for one public page. */
  const pageMetadata = ({ locale, path = "", title, description, images }: PageMetadataInput<L>): Metadata => {
    const canonical = localePath(locale, path);
    return {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      alternates: {
        canonical,
        ...(locales.length > 0 ? { languages: languageAlternates(path) } : {}),
      },
      openGraph: {
        type: "website",
        siteName: config.name,
        locale: tag(locale),
        url: canonical,
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        images: images ?? [defaultShareImage(locale)],
      },
    };
  };

  /** The metadata for the locale root layout: the title template, the index directive and the front page's canonical. */
  const siteMetadata = ({ locale, description, manifest }: SiteMetadataInput<L>): Metadata => {
    const title = fullTitle(locale);
    return {
      ...pageMetadata({ locale, title, description }),
      metadataBase: new URL(config.url),
      title: { default: title, template: `%s${config.titleSeparator}${config.name}` },
      ...(manifest ? { manifest } : {}),
      robots: { index: true, follow: true },
    };
  };

  /** One sitemap entry per locale a page is served in, each listing the others as alternates. */
  const localeEntries = (path: string, options: LocaleEntryOptions<L> = {}): MetadataRoute.Sitemap => {
    const served = options.locales ?? locales;

    const languages: Record<string, string> = Object.fromEntries(served.map(l => [tag(l), absoluteLocaleUrl(l, path)]));
    if (defaultLocale !== undefined && served.includes(defaultLocale)) {
      languages["x-default"] = absoluteLocaleUrl(defaultLocale, path);
    }

    return served.map(locale => {
      const lastModified = options.lastModified?.(locale);
      return { url: absoluteLocaleUrl(locale, path), ...(lastModified ? { lastModified } : {}), alternates: { languages } };
    });
  };

  /**
   * robots.txt. A deployment that is not production disallows everything. Otherwise the private
   * paths are disallowed under every locale segment, since a bare `/admin` matches nothing there.
   */
  const robots = ({ privatePaths = [], privateRootPaths = [], indexable = isIndexableEnvironment() }: RobotsInput = {}): MetadataRoute.Robots => {
    if (!indexable) return { rules: { userAgent: "*", disallow: "/" } };

    const below = locales.length > 0 ? locales.flatMap(l => privatePaths.map(p => localePath(l, p))) : [...privatePaths];
    return {
      rules: { userAgent: "*", allow: "/", disallow: [...below, ...privateRootPaths] },
      sitemap: absoluteUrl("/sitemap.xml"),
      host: config.url,
    };
  };

  /** An `@id` for an entity that is the same on every page. Page-scoped nodes use the page URL. */
  const siteId = (fragment: string): string => `${config.url}/#${fragment}`;
  const ids = { organization: siteId("organization"), website: siteId("website") } as const;

  /** The business, under a stable `@id` that page-scoped nodes point at. */
  const organizationNode = (company: OrganizationInfo, options: OrganizationOptions = {}): SchemaNode => {
    const country = options.country ?? "NO";
    return {
      "@type": options.type ?? "Organization",
      "@id": ids.organization,
      name: company.name,
      ...(company.legalName && company.legalName !== company.name ? { legalName: company.legalName } : {}),
      url: absoluteUrl(),
      image: absoluteUrl(options.image ?? "/icon.png"),
      logo: absoluteUrl(options.logo ?? "/logo.png"),
      telephone: company.phone,
      email: company.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: company.streetAddress || company.address,
        ...(company.postalCode ? { postalCode: company.postalCode } : {}),
        ...(company.addressLocality ? { addressLocality: company.addressLocality } : {}),
        ...(company.addressRegion ? { addressRegion: company.addressRegion } : {}),
        addressCountry: country,
      },
      areaServed: country,
      ...(company.vatRegistered && company.orgNumber ? { vatID: `NO${company.orgNumber.replace(/\s/g, "")}MVA` } : {}),
      ...(company.orgNumber ? { taxID: company.orgNumber } : {}),
    };
  };

  /** The site as an entity, so search engines attribute its pages to it and to the business. */
  const webSiteNode = (locale: L): SchemaNode => ({
    "@type": "WebSite",
    "@id": ids.website,
    url: absoluteUrl(),
    name: config.name,
    inLanguage: tag(locale),
    publisher: ref(ids.organization),
  });

  /** The trail search results show in place of the raw URL. The last crumb has no `item`. */
  const breadcrumbNode = (crumbs: Crumb[], pageUrl: string): SchemaNode => ({
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      ...(crumb.path ? { item: absoluteUrl(crumb.path) } : {}),
    })),
  });

  /** Marks a listing page as an ordered set of pages. */
  const itemListNode = (paths: string[], pageUrl: string): SchemaNode => ({
    "@type": "ItemList",
    "@id": `${pageUrl}#itemlist`,
    numberOfItems: paths.length,
    itemListElement: paths.map((path, index) => ({ "@type": "ListItem", position: index + 1, url: absoluteUrl(path) })),
  });

  return {
    name: config.name,
    url: config.url,
    normalizePath,
    localePath,
    absoluteUrl,
    absoluteLocaleUrl,
    languageAlternates,
    pageMetadata,
    siteMetadata,
    localeEntries,
    robots,
    siteId,
    ids,
    organizationNode,
    webSiteNode,
    breadcrumbNode,
    itemListNode,
  };
}

export type Site<L extends string = string> = ReturnType<typeof defineSite<L>>;
