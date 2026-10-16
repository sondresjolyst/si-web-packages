import type { Metadata, MetadataRoute } from "next";
import { isIndexableEnvironment } from "./environment";
import { ref, type OrganizationInfo, type SchemaNode } from "./schema";
import { parseTimestamp } from "./sitemap";

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
  /** The locales the page exists in. Defaults to all of them. A site without locales ignores it. */
  locales?: readonly L[] | undefined;
  /** When the page last changed, per locale. Left out when unknown. A site without locales calls it once, with no locale. */
  lastModified?: ((locale: L) => Date | undefined) | undefined;
}

/** The legal pages every site has, as `createLegalService` names them. */
export const LEGAL_PAGE_KEYS = ["terms", "privacy", "cookies"] as const;

export interface LegalEntriesInput<K extends string, L extends string> {
  /** The legal pages, each at `/<key>` below the locale. Defaults to `LEGAL_PAGE_KEYS`. */
  keys?: readonly K[] | undefined;
  /** When a page last changed, as the API's timestamp. A site without locales gets no locale. */
  updatedAt: (key: K, locale: L | undefined) => Promise<string | null | undefined>;
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
  /** The schema.org type, such as `ComputerStore`, or several, such as `["Organization", "LocalBusiness"]`. Defaults to `Organization`. */
  type?: string | readonly string[] | undefined;
  /** Pages about the same business elsewhere, such as its entry in Brønnøysundregistrene. */
  sameAs?: readonly string[] | undefined;
  /** The ISO country code for the address and the area served. Defaults to `NO`. */
  country?: string | undefined;
  /** Site-relative paths of the square image and the logo. Default to `/icon.png` and `/logo.png`. */
  image?: string | undefined;
  logo?: string | undefined;
}

/**
 * One leading slash, no trailing slash. `""` and `"/"` both mean the front page. Tabs and line
 * breaks are removed, as a URL parser removes them, and leading slashes and backslashes collapse
 * to one, so a path always stays on the site's own host.
 */
export function normalizePath(path: string): string {
  const clean = path.replace(/[\t\n\r]/g, "");
  if (clean === "") return "";
  const withSlash = `/${clean.replace(/^[/\\]+/, "")}`;
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
  const origin = new URL(config.url).origin;

  /** A site-relative URL for a page in one locale, such as `/no/builds`. A site without locales has no segment. */
  const localePath = (locale: L | undefined, path = ""): string =>
    locale === undefined || locales.length === 0 ? normalizePath(path) || "/" : `/${locale}${normalizePath(path)}`;

  /** An absolute URL on the canonical origin, without a trailing slash. */
  const absoluteUrl = (path = ""): string => {
    const url = new URL(normalizePath(path) || "/", config.url);
    // A path that would leave the site's origin gives the front page instead.
    if (url.origin !== origin) return config.url;
    return url.toString().replace(/\/$/, "") || config.url;
  };

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

  /**
   * One sitemap entry per locale a page is served in, each listing the others as alternates. A site
   * without locales has one URL per page, so it gets one entry with no alternates.
   */
  const localeEntries = (path: string, options: LocaleEntryOptions<L> = {}): MetadataRoute.Sitemap => {
    if (locales.length === 0) {
      // There is no locale to pass, and the callback's type cannot say so without making every caller's simpler.
      const lastModified = options.lastModified?.(undefined as never);
      return [{ url: absoluteUrl(path), ...(lastModified ? { lastModified } : {}) }];
    }
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

  /** Runs `load` for every locale at once and keys the results by locale. A site without locales gets `{}`. */
  const forEachLocale = async <T>(load: (locale: L) => Promise<T>): Promise<Partial<Record<L, T>>> =>
    Object.fromEntries(await Promise.all(locales.map(async locale => [locale, await load(locale)] as const))) as Partial<Record<L, T>>;

  /**
   * The legal pages' sitemap entries, each dated by when it last changed in that locale. The
   * timestamps are fetched at once. An error from `updatedAt` fails the sitemap, so a stale one is
   * served rather than one without dates.
   */
  const legalEntries = async <K extends string = (typeof LEGAL_PAGE_KEYS)[number]>({
    keys,
    updatedAt,
  }: LegalEntriesInput<K, L>): Promise<MetadataRoute.Sitemap> => {
    const pages = keys ?? (LEGAL_PAGE_KEYS as unknown as readonly K[]);
    const served: (L | undefined)[] = locales.length > 0 ? [...locales] : [undefined];
    const stamps = await Promise.all(
      pages.map(key => Promise.all(served.map(async locale => parseTimestamp(await updatedAt(key, locale))))),
    );
    return pages.flatMap((key, k) => localeEntries(`/${key}`, { lastModified: locale => stamps[k]?.[served.indexOf(locale)] }));
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
    const type = typeof options.type === "string" ? options.type || undefined : options.type?.length ? [...options.type] : undefined;
    const phone = company.phone?.trim();
    const email = company.email?.trim();
    return {
      "@type": type ?? "Organization",
      "@id": ids.organization,
      name: company.name,
      ...(company.legalName && company.legalName !== company.name ? { legalName: company.legalName } : {}),
      url: absoluteUrl(),
      image: absoluteUrl(options.image ?? "/icon.png"),
      logo: absoluteUrl(options.logo ?? "/logo.png"),
      ...(phone ? { telephone: phone } : {}),
      ...(email ? { email } : {}),
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
      ...(options.sameAs?.length ? { sameAs: [...options.sameAs] } : {}),
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
    forEachLocale,
    legalEntries,
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
