import type { Metadata } from "next";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defineSite, isIndexableEnvironment, LEGAL_PAGE_KEYS, latest, NOINDEX, normalizePath, parseTimestamp, ref, serializeGraph, SHARE_IMAGE_SIZE, type OrganizationInfo } from "../../seo";

const URL_ = "https://www.altinnendata.no";
const site = defineSite({
  name: "Altinnendata",
  url: URL_,
  titleSeparator: " | ",
  locales: ["no", "en"] as const,
  defaultLocale: "no",
  localeTags: { no: "no", en: "en" },
  tagline: locale => (locale === "no" ? "Brukte PC-er" : "Used PCs"),
});
const plain = defineSite({ name: "NS Tuning", url: "https://www.nstuning.no", titleSeparator: " | " });

const languagesOf = (meta: Metadata): Record<string, unknown> => (meta.alternates?.languages ?? {}) as Record<string, unknown>;

const company: OrganizationInfo = {
  name: "Altinnendata",
  legalName: "Altinnendata",
  orgNumber: "",
  vatRegistered: false,
  address: "Mårvegen 21a, 4347 Lye",
  streetAddress: "Mårvegen 21a",
  postalCode: "4347",
  addressLocality: "Lye",
  addressRegion: "Rogaland",
  email: "post@example.com",
  phone: "+47 473 88 759",
};

describe("urls", () => {
  it("normalise a path to a leading slash and no trailing slash", () => {
    expect(normalizePath("")).toBe("");
    expect(normalizePath("/")).toBe("");
    expect(normalizePath("builds")).toBe("/builds");
    expect(normalizePath("/builds/")).toBe("/builds");
  });

  it("stay on the site's own host, whatever slashes a path starts with", () => {
    const bs = String.fromCharCode(92);
    for (const path of ["//evil.example/x", `/${bs}evil.example/x`, `${bs}${bs}evil.example/x`, `${bs}/evil.example/x`, "///x"]) {
      expect(new URL(site.absoluteUrl(path)).host, path).toBe("www.altinnendata.no");
      expect(site.absoluteUrl(path).startsWith(`${URL_}/`), path).toBe(true);
    }
    expect(normalizePath("//a/b/")).toBe("/a/b");
    expect(site.localePath("no", "//evil.example")).toBe("/no/evil.example");
  });

  it("stay on the site's own host when tabs or line breaks hide a second slash", () => {
    const bs = String.fromCharCode(92);
    for (const path of ["/\t/evil.example/x", "/\n/evil.example/x", "/\r/evil.example/x", "\t//evil.example/x", `/${bs}\t${bs}evil.example`]) {
      expect(new URL(site.absoluteUrl(path)).host, JSON.stringify(path)).toBe("www.altinnendata.no");
    }
    expect(normalizePath("/a\t/b\n")).toBe("/a/b");
  });

  it("stay on the site's own host for any mix of slashes, backslashes, spaces and line breaks", () => {
    const parts = ["/", String.fromCharCode(92), "\t", "\n", "\r", " ", "."];
    for (let n = 0; n < 2000; n++) {
      let prefix = "";
      for (let i = n; i > 0; i = Math.floor(i / parts.length)) prefix += parts[i % parts.length];
      const path = `${prefix}evil.example/x`;
      expect(new URL(site.absoluteUrl(path)).host, JSON.stringify(path)).toBe("www.altinnendata.no");
      expect(new URL(site.absoluteLocaleUrl("no", path)).host, JSON.stringify(path)).toBe("www.altinnendata.no");
    }
  });

  it("prefix the locale segment", () => {
    expect(site.localePath("no")).toBe("/no");
    expect(site.localePath("en", "/builds")).toBe("/en/builds");
    expect(site.localePath("no", "builds/gaming-pc/")).toBe("/no/builds/gaming-pc");
  });

  it("have no segment on a site without locales", () => {
    expect(plain.localePath(undefined)).toBe("/");
    expect(plain.localePath(undefined, "/dyno-runs/")).toBe("/dyno-runs");
    expect(plain.localePath("no" as never, "/dyno-runs")).toBe("/dyno-runs");
  });

  it("build absolute URLs without a trailing slash", () => {
    expect(site.absoluteUrl()).toBe(URL_);
    expect(site.absoluteUrl("/")).toBe(URL_);
    expect(site.absoluteUrl("/sitemap.xml")).toBe(`${URL_}/sitemap.xml`);
    expect(site.absoluteLocaleUrl("no", "/contact")).toBe(`${URL_}/no/contact`);
    expect(site.absoluteLocaleUrl("en")).toBe(`${URL_}/en`);
  });

  it("list every locale as an alternate, with x-default at the default locale", () => {
    expect(site.languageAlternates("/builds")).toEqual({ no: "/no/builds", en: "/en/builds", "x-default": "/no/builds" });
  });

  it("default the default locale to the first, and each tag to the locale", () => {
    const s = defineSite({ name: "S", url: URL_, titleSeparator: " | ", locales: ["en", "no"] as const });
    expect(s.languageAlternates("")).toEqual({ en: "/en", no: "/no", "x-default": "/en" });
  });
});

describe("locale tags", () => {
  const tagged = defineSite({ name: "S", url: URL_, titleSeparator: " | ", locales: ["no", "en"] as const, localeTags: { no: "nb-NO" } });

  it("name each locale by its tag in alternates, Open Graph, the sitemap and structured data", () => {
    expect(tagged.languageAlternates("/a")).toEqual({ "nb-NO": "/no/a", en: "/en/a", "x-default": "/no/a" });
    expect(tagged.pageMetadata({ locale: "no" }).openGraph).toMatchObject({ locale: "nb-NO" });
    expect(tagged.localeEntries("/a")[0].alternates?.languages).toHaveProperty("nb-NO", `${URL_}/no/a`);
    expect(tagged.webSiteNode("no")).toMatchObject({ inLanguage: "nb-NO" });
  });
});

describe("pageMetadata", () => {
  it("canonicalises to the requested locale", () => {
    expect(site.pageMetadata({ locale: "en", path: "/builds" }).alternates?.canonical).toBe("/en/builds");
  });

  it("lists every locale as a language alternate, with x-default at the default locale", () => {
    const languages = languagesOf(site.pageMetadata({ locale: "en", path: "/contact" }));
    expect(languages).toEqual({ no: "/no/contact", en: "/en/contact", "x-default": "/no/contact" });
  });

  it("mirrors the canonical URL, title and description into Open Graph", () => {
    const meta = site.pageMetadata({ locale: "no", path: "/builds/gaming-pc", title: "Gaming PC", description: "Rask" });
    expect(meta).toMatchObject({ title: "Gaming PC", description: "Rask" });
    expect(meta.openGraph).toMatchObject({
      type: "website", siteName: "Altinnendata", locale: "no", url: "/no/builds/gaming-pc", title: "Gaming PC", description: "Rask",
    });
  });

  it("leaves out optional fields rather than emitting empty ones", () => {
    const meta = site.pageMetadata({ locale: "no" });
    expect(meta).not.toHaveProperty("title");
    expect(meta).not.toHaveProperty("description");
    expect(meta.openGraph).not.toHaveProperty("title");
  });

  it("gives every page the share image for its locale, unless it has its own", () => {
    expect(site.pageMetadata({ locale: "en", path: "/contact" }).openGraph?.images).toEqual([
      { url: "/en/og", width: 1200, height: 630, type: "image/png", alt: "Altinnendata | Used PCs" },
    ]);
    expect(site.pageMetadata({ locale: "no", images: ["https://img.example/cover"] }).openGraph?.images).toEqual(["https://img.example/cover"]);
  });

  it("takes another share image path", () => {
    const s = defineSite({ name: "S", url: URL_, titleSeparator: " | ", locales: ["no"] as const, shareImagePath: "/share" });
    expect((s.pageMetadata({ locale: "no" }).openGraph?.images as { url: string }[])[0].url).toBe("/no/share");
  });

  it("has no language alternates on a site without locales", () => {
    const meta = plain.pageMetadata({ locale: undefined as never, path: "/dyno-runs" });
    expect(meta.alternates).toEqual({ canonical: "/dyno-runs" });
  });
});

describe("siteMetadata", () => {
  it("carries the title template, the index directive and the front page's canonical", () => {
    const meta = site.siteMetadata({ locale: "no", description: "Beskrivelse", manifest: "/manifest.json" });
    expect(meta.title).toEqual({ default: "Altinnendata | Brukte PC-er", template: "%s | Altinnendata" });
    expect(meta.description).toBe("Beskrivelse");
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(meta.alternates?.canonical).toBe("/no");
    expect(meta.manifest).toBe("/manifest.json");
    expect(meta.metadataBase).toEqual(new URL(URL_));
    expect(meta.openGraph).toMatchObject({ title: "Altinnendata | Brukte PC-er", url: "/no" });
  });

  it("uses the name alone without a tagline, and no manifest unless given", () => {
    const meta = plain.siteMetadata({ locale: undefined as never });
    expect(meta.title).toEqual({ default: "NS Tuning", template: "%s | NS Tuning" });
    expect(meta).not.toHaveProperty("manifest");
  });

  it("gives private pages a noindex directive", () => {
    expect(NOINDEX).toEqual({ index: false, follow: false });
    expect(SHARE_IMAGE_SIZE).toEqual({ width: 1200, height: 630 });
  });
});

describe("localeEntries", () => {
  it("emits one entry per locale, cross-linked as alternates", () => {
    const entries = site.localeEntries("/builds");
    expect(entries.map(e => e.url)).toEqual([`${URL_}/no/builds`, `${URL_}/en/builds`]);
    expect(entries[0].alternates?.languages).toEqual({ no: `${URL_}/no/builds`, en: `${URL_}/en/builds`, "x-default": `${URL_}/no/builds` });
  });

  it("claims only the locales a page is published in", () => {
    const entries = site.localeEntries("/builds/en-only", { locales: ["en"] });
    expect(entries).toHaveLength(1);
    expect(entries[0].alternates?.languages).toEqual({ en: `${URL_}/en/builds/en-only` });
  });

  it("is empty for a page in no locale", () => {
    expect(site.localeEntries("/x", { locales: [] })).toEqual([]);
  });

  it("uses each locale's own timestamp, and leaves it out when unknown", () => {
    const stamps: Record<string, Date> = { no: new Date("2026-01-01T00:00:00Z") };
    const entries = site.localeEntries("/terms", { lastModified: l => stamps[l] });
    expect(entries[0].lastModified).toEqual(stamps.no);
    expect(entries[1]).not.toHaveProperty("lastModified");
  });

  it("gives a site without locales one entry per page, with no alternates", () => {
    const stamp = new Date("2026-03-01T10:00:00Z");
    const seen: unknown[] = [];
    const entries = plain.localeEntries("/terms", { lastModified: l => (seen.push(l), stamp) });

    expect(entries).toEqual([{ url: "https://www.nstuning.no/terms", lastModified: stamp }]);
    expect(seen).toEqual([undefined]);
    expect(plain.localeEntries("")).toEqual([{ url: "https://www.nstuning.no" }]);
    expect(plain.localeEntries("/x", { locales: [] })).toHaveLength(1);
  });
});

describe("robots", () => {
  it("disallows the private paths under every locale, and the root paths once", () => {
    expect(site.robots({ privatePaths: ["/admin", "/login"], privateRootPaths: ["/api/"], indexable: true })).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/no/admin", "/no/login", "/en/admin", "/en/login", "/api/"] },
      sitemap: `${URL_}/sitemap.xml`,
      host: URL_,
    });
  });

  it("disallows the paths as they are on a site without locales", () => {
    expect(plain.robots({ privatePaths: ["/admin", "/profile"], privateRootPaths: ["/api/"], indexable: true })).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/profile", "/api/"] },
      sitemap: "https://www.nstuning.no/sitemap.xml",
      host: "https://www.nstuning.no",
    });
  });

  it("disallows everything on a deployment that is not production", () => {
    expect(site.robots({ privatePaths: ["/admin"], indexable: false })).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });

  describe("reads SITE_ENV when not told", () => {
    const original = process.env.SITE_ENV;
    afterEach(() => {
      if (original === undefined) delete process.env.SITE_ENV;
      else process.env.SITE_ENV = original;
    });

    it("on each call, so one build serves either environment", () => {
      process.env.SITE_ENV = "dev";
      expect(plain.robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
      process.env.SITE_ENV = "prod";
      expect(plain.robots().rules).toMatchObject({ allow: "/" });
    });
  });
});

describe("isIndexableEnvironment", () => {
  const original = process.env.SITE_ENV;
  beforeEach(() => { delete process.env.SITE_ENV; });
  afterEach(() => {
    if (original === undefined) delete process.env.SITE_ENV;
    else process.env.SITE_ENV = original;
  });

  it("treats the values the deploy workflows send as production", () => {
    for (const value of ["prod", "production", "Prod", "  PRODUCTION  "]) expect(isIndexableEnvironment(value), value).toBe(true);
  });

  it("treats anything else as a host that must not be crawled", () => {
    for (const value of ["dev", "development", "staging", "test", "preview"]) expect(isIndexableEnvironment(value), value).toBe(false);
  });

  it("assumes production when unset or blank, rather than risk deindexing the live site", () => {
    expect(isIndexableEnvironment()).toBe(true);
    for (const value of ["", "   "]) expect(isIndexableEnvironment(value)).toBe(true);
    process.env.SITE_ENV = "dev";
    expect(isIndexableEnvironment()).toBe(false);
  });
});

describe("structured data", () => {
  it("gives entities that are the same on every page a stable id", () => {
    expect(site.ids).toEqual({ organization: `${URL_}/#organization`, website: `${URL_}/#website` });
    expect(site.siteId("x")).toBe(`${URL_}/#x`);
    expect(ref("a")).toEqual({ "@id": "a" });
  });

  it("describes the business, with the address as separate fields", () => {
    expect(site.organizationNode(company)).toEqual({
      "@type": "Organization",
      "@id": `${URL_}/#organization`,
      name: "Altinnendata",
      url: URL_,
      image: `${URL_}/icon.png`,
      logo: `${URL_}/logo.png`,
      telephone: "+47 473 88 759",
      email: "post@example.com",
      address: { "@type": "PostalAddress", streetAddress: "Mårvegen 21a", postalCode: "4347", addressLocality: "Lye", addressRegion: "Rogaland", addressCountry: "NO" },
      areaServed: "NO",
    });
  });

  it("takes another type, country and images", () => {
    const node = site.organizationNode(company, { type: "ComputerStore", country: "SE", image: "/i.png", logo: "/l.png" });
    expect(node).toMatchObject({ "@type": "ComputerStore", areaServed: "SE", image: `${URL_}/i.png`, logo: `${URL_}/l.png` });
    expect(node.address).toMatchObject({ addressCountry: "SE" });
  });

  it("takes several types and the business's pages elsewhere", () => {
    const types = ["Organization", "LocalBusiness"] as const;
    const node = site.organizationNode(company, { type: types, sameAs: ["https://virksomhet.brreg.no/x"] });
    expect(node).toMatchObject({ "@type": ["Organization", "LocalBusiness"], sameAs: ["https://virksomhet.brreg.no/x"] });
    expect(node["@type"]).not.toBe(types);
    expect(site.organizationNode(company, { sameAs: [] })).not.toHaveProperty("sameAs");
    expect(site.organizationNode(company)).not.toHaveProperty("sameAs");
    expect(site.organizationNode(company, { type: [] })["@type"]).toBe("Organization");
    expect(site.organizationNode(company, { type: "" })["@type"]).toBe("Organization");
  });

  it("leaves out a phone number and email nobody filled in", () => {
    const node = site.organizationNode({ ...company, phone: "  ", email: undefined });
    expect(node).not.toHaveProperty("telephone");
    expect(node).not.toHaveProperty("email");
    expect(site.organizationNode({ ...company, phone: " +47 1 ", email: " a@b.no " })).toMatchObject({ telephone: "+47 1", email: "a@b.no" });
  });

  it("has a legal name only when it differs from the name", () => {
    expect(site.organizationNode({ ...company, legalName: "Altinnendata AS" })).toHaveProperty("legalName", "Altinnendata AS");
  });

  it("has VAT and org ids only once registered", () => {
    expect(site.organizationNode({ ...company, orgNumber: "123 456 789" })).toMatchObject({ taxID: "123 456 789" });
    expect(site.organizationNode({ ...company, orgNumber: "123 456 789" })).not.toHaveProperty("vatID");
    expect(site.organizationNode({ ...company, orgNumber: "123 456 789", vatRegistered: true })).toMatchObject({ vatID: "NO123456789MVA" });
    expect(site.organizationNode({ ...company, vatRegistered: true })).not.toHaveProperty("vatID");
  });

  it("leaves out address parts nobody filled in, and falls back to the one-line address", () => {
    const partial = { ...company, streetAddress: "", postalCode: "", addressLocality: "", addressRegion: "" };
    expect(site.organizationNode(partial).address).toEqual({ "@type": "PostalAddress", streetAddress: "Mårvegen 21a, 4347 Lye", addressCountry: "NO" });
  });

  it("describes the site, published by the business", () => {
    expect(site.webSiteNode("en")).toEqual({
      "@type": "WebSite", "@id": `${URL_}/#website`, url: URL_, name: "Altinnendata", inLanguage: "en", publisher: { "@id": `${URL_}/#organization` },
    });
  });

  it("builds breadcrumbs, with no item on the current page", () => {
    expect(site.breadcrumbNode([{ name: "Hjem", path: "/no" }, { name: "PC" }], `${URL_}/no/x`)).toEqual({
      "@type": "BreadcrumbList",
      "@id": `${URL_}/no/x#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Hjem", item: `${URL_}/no` },
        { "@type": "ListItem", position: 2, name: "PC" },
      ],
    });
  });

  it("lists a listing page's items in order", () => {
    expect(site.itemListNode(["/no/a", "/no/b"], `${URL_}/no/builds`)).toEqual({
      "@type": "ItemList",
      "@id": `${URL_}/no/builds#itemlist`,
      numberOfItems: 2,
      itemListElement: [
        { "@type": "ListItem", position: 1, url: `${URL_}/no/a` },
        { "@type": "ListItem", position: 2, url: `${URL_}/no/b` },
      ],
    });
  });

  it("serializes the graph so text cannot close the script tag", () => {
    const json = serializeGraph([{ "@type": "Thing", name: "</script><script>alert(1)</script>" }]);
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toEqual({ "@context": "https://schema.org", "@graph": [{ "@type": "Thing", name: "</script><script>alert(1)</script>" }] });
  });
});

describe("timestamps", () => {
  it("take the newest of several dates", () => {
    const older = new Date("2026-01-01T00:00:00Z");
    const newer = new Date("2026-06-01T00:00:00Z");
    expect(latest([older, newer, undefined])).toEqual(newer);
    expect(latest([newer, older])).toEqual(newer);
    expect(latest([undefined])).toBeUndefined();
  });

  it("reject missing and malformed timestamps", () => {
    expect(parseTimestamp("2026-08-12T10:18:39.409492Z")?.toISOString()).toBe("2026-08-12T10:18:39.409Z");
    expect(parseTimestamp(null)).toBeUndefined();
    expect(parseTimestamp("")).toBeUndefined();
    expect(parseTimestamp("not a date")).toBeUndefined();
  });
});

describe("forEachLocale", () => {
  it("loads every locale at once and keys the results by locale", async () => {
    const started: string[] = [];
    const result = await site.forEachLocale(async locale => {
      started.push(locale);
      await new Promise(resolve => setTimeout(resolve, locale === "no" ? 20 : 0));
      return locale.toUpperCase();
    });

    expect(result).toEqual({ no: "NO", en: "EN" });
    expect(started).toEqual(["no", "en"]);
  });

  it("gives a site without locales nothing", async () => {
    expect(await plain.forEachLocale(async () => 1)).toEqual({});
  });
});

describe("legalEntries", () => {
  it("dates each legal page in each locale by its own timestamp", async () => {
    const asked: string[] = [];
    const entries = await site.legalEntries({
      updatedAt: async (key, locale) => {
        asked.push(`${key}:${locale}`);
        return key === "terms" && locale === "en" ? "2026-02-03T04:05:06Z" : key === "privacy" ? "bad" : null;
      },
    });

    expect(asked.sort()).toEqual(LEGAL_PAGE_KEYS.flatMap(k => [`${k}:en`, `${k}:no`]).sort());
    expect(entries.map(e => e.url)).toEqual([
      `${URL_}/no/terms`, `${URL_}/en/terms`, `${URL_}/no/privacy`, `${URL_}/en/privacy`, `${URL_}/no/cookies`, `${URL_}/en/cookies`,
    ]);
    expect(entries[1].lastModified).toEqual(new Date("2026-02-03T04:05:06Z"));
    expect(entries.filter(e => e.lastModified)).toHaveLength(1);
    expect(entries[0].alternates?.languages).toHaveProperty("en", `${URL_}/en/terms`);
  });

  it("takes the app's own keys, and gives a site without locales one entry each", async () => {
    const entries = await plain.legalEntries({ keys: ["terms", "returns"], updatedAt: async (key, locale) => (locale === undefined && key === "returns" ? "2026-05-01" : undefined) });

    expect(entries).toEqual([
      { url: "https://www.nstuning.no/terms" },
      { url: "https://www.nstuning.no/returns", lastModified: new Date("2026-05-01") },
    ]);
  });

  it("fails when a timestamp cannot be fetched, so the last good sitemap stays", async () => {
    await expect(site.legalEntries({ updatedAt: async () => { throw new Error("API down"); } })).rejects.toThrow("API down");
  });
});
