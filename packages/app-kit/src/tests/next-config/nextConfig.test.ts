import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  apiBaseUrl,
  apiOrigin,
  contentImagesRewrite,
  contentSecurityPolicy,
  defineAppConfig,
  securityHeaders,
  type Header,
} from "../../next-config";

const API = "https://pyttogpanne-api.prod.tumogroup.com/api";
const ORIGIN = "https://pyttogpanne-api.prod.tumogroup.com";

// The policies the apps' own next.config.ts produced, with frame-src and object-src narrowed to
// 'none'. No page embeds a frame or an object.
const PYTTOGPANNE_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
  `connect-src 'self' ${ORIGIN}; frame-src 'none'; object-src 'none'; font-src 'self'; base-uri 'self'; form-action 'self'; ` +
  "frame-ancestors 'none'; upgrade-insecure-requests";
const NSTUNING_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
  `img-src 'self' ${ORIGIN} data: blob:; connect-src 'self' ${ORIGIN}; frame-src 'none'; object-src 'none'; font-src 'self'; ` +
  "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";
const GARGE_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
  `connect-src 'self' ${ORIGIN} wss://pyttogpanne-api.prod.tumogroup.com; frame-src 'none'; object-src 'none'; font-src 'self'; ` +
  "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";

const pageHeaders = (csp: string): Header[] => [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Content-Security-Policy", value: csp },
];

const nstuningReportHeaders: Header[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

describe("apiOrigin and apiBaseUrl", () => {
  it("read the origin and the base", () => {
    expect(apiOrigin(API)).toBe(ORIGIN);
    expect(apiBaseUrl(API)).toBe(API);
    expect(apiBaseUrl(`${API}/`)).toBe(API);
  });

  it.each([undefined, "", "not a url", "/api"])("give an empty string for %j", url => {
    expect(apiOrigin(url)).toBe("");
    expect(apiBaseUrl(url)).toBe("");
  });
});

describe("contentSecurityPolicy", () => {
  it("matches pyttogpanne and altinnendata", () => {
    expect(contentSecurityPolicy({ apiUrl: API, dev: false })).toBe(PYTTOGPANNE_CSP);
  });

  it("matches nstuning, which loads images from the API", () => {
    expect(contentSecurityPolicy({ apiUrl: API, dev: false, imgFromApi: true })).toBe(NSTUNING_CSP);
  });

  it("matches garge, which opens a WebSocket to the API", () => {
    expect(contentSecurityPolicy({ apiUrl: API, dev: false, websocket: true })).toBe(GARGE_CSP);
    expect(contentSecurityPolicy({ apiUrl: "http://localhost:5000/api", dev: false, websocket: true }))
      .toContain("connect-src 'self' http://localhost:5000 ws://localhost:5000;");
  });

  it("allows eval in development only", () => {
    expect(contentSecurityPolicy({ apiUrl: API, dev: true })).toContain("script-src 'self' 'unsafe-eval' 'unsafe-inline';");
    expect(contentSecurityPolicy({ apiUrl: API, dev: false })).not.toContain("unsafe-eval");
  });

  it("leaves the API out when its URL is missing", () => {
    const csp = contentSecurityPolicy({ apiUrl: undefined, dev: false, websocket: true, imgFromApi: true });
    expect(csp).toContain("img-src 'self' data: blob:;");
    expect(csp).toContain("connect-src 'self';");
  });

  it("takes extra sources, and frames or objects only when asked", () => {
    const csp = contentSecurityPolicy({
      apiUrl: API, dev: false, connectSrc: ["https://vitals.example"], imgSrc: ["https://cdn.example"],
      frameSrc: ["https://www.youtube-nocookie.com"], objectSrc: ["'self'"],
    });
    expect(csp).toContain(`connect-src 'self' ${ORIGIN} https://vitals.example;`);
    expect(csp).toContain("img-src 'self' data: blob: https://cdn.example;");
    expect(csp).toContain("frame-src https://www.youtube-nocookie.com;");
    expect(csp).toContain("object-src 'self';");
  });
});

describe("securityHeaders", () => {
  it("are the apps' page headers", () => {
    expect(securityHeaders({ apiUrl: API, dev: false })).toEqual(pageHeaders(PYTTOGPANNE_CSP));
  });

  it("take another Permissions-Policy", () => {
    const headers = securityHeaders({ apiUrl: API, dev: false, permissionsPolicy: "camera=(self)" });
    expect(headers.find(h => h.key === "Permissions-Policy")?.value).toBe("camera=(self)");
  });
});

describe("contentImagesRewrite", () => {
  it("proxies content images to the API", () => {
    expect(contentImagesRewrite(API)).toEqual([
      { source: "/content-images/:path*", destination: `${API}/content-images/:path*` },
    ]);
  });

  it("is empty without an API URL", () => {
    expect(contentImagesRewrite(undefined)).toEqual([]);
    expect(contentImagesRewrite("nonsense")).toEqual([]);
  });

  it("takes another path", () => {
    expect(contentImagesRewrite(API, { source: "/img", upstreamPath: "/images" })).toEqual([
      { source: "/img/:path*", destination: `${API}/images/:path*` },
    ]);
  });
});

describe("defineAppConfig", () => {
  it("gives pyttogpanne and altinnendata their config", async () => {
    const config = defineAppConfig({ apiUrl: API, dev: false, contentImages: true });
    expect(config).toMatchObject({
      output: "standalone",
      poweredByHeader: false,
      expireTime: 300,
      transpilePackages: ["@sjolystinnovation/app-kit"],
      images: { qualities: [75, 100] },
      experimental: { isrFlushToDisk: false },
    });
    expect(await config.headers!()).toEqual([{ source: "/:path*", headers: pageHeaders(PYTTOGPANNE_CSP) }]);
    expect(await config.rewrites!()).toEqual([
      { source: "/content-images/:path*", destination: `${API}/content-images/:path*` },
    ]);
  });

  it("gives nstuning its report headers, and its pages none of them", async () => {
    const config = defineAppConfig({
      apiUrl: API, dev: false, imgFromApi: true,
      pathHeaders: [{ source: "/api/report/:path*", headers: nstuningReportHeaders }],
    });
    expect(await config.headers!()).toEqual([
      { source: "/api/report/:path*", headers: nstuningReportHeaders },
      { source: "/((?!api/report/).*)", headers: pageHeaders(NSTUNING_CSP) },
    ]);
    expect(await config.rewrites!()).toEqual([]);
  });

  it("gives garge its config", async () => {
    const config = defineAppConfig({ apiUrl: API, dev: false, websocket: true });
    expect(await config.headers!()).toEqual([{ source: "/:path*", headers: pageHeaders(GARGE_CSP) }]);
  });

  it("merges an app's own config over it", async () => {
    const config = defineAppConfig(
      { apiUrl: API, dev: false, contentImages: true, expireTime: 60, isrFlushToDisk: true },
      {
        transpilePackages: ["@sjolystinnovation/app-kit", "other-lib"],
        images: { remotePatterns: [{ hostname: "cdn.example" }] },
        reactStrictMode: true,
        async headers() { return [{ source: "/feed.xml", headers: [{ key: "Cache-Control", value: "no-store" }] }]; },
        async rewrites() { return { beforeFiles: [], afterFiles: [{ source: "/old", destination: "/new" }], fallback: [] }; },
      },
    );
    expect(config.transpilePackages).toEqual(["@sjolystinnovation/app-kit", "other-lib"]);
    expect(config.images).toEqual({ qualities: [75, 100], remotePatterns: [{ hostname: "cdn.example" }] });
    expect(config).toMatchObject({ reactStrictMode: true, expireTime: 60, experimental: { isrFlushToDisk: true } });
    expect((await config.headers!()).map(h => h.source)).toEqual(["/:path*", "/feed.xml"]);
    expect(await config.rewrites!()).toEqual({
      beforeFiles: [],
      afterFiles: [{ source: "/content-images/:path*", destination: `${API}/content-images/:path*` }, { source: "/old", destination: "/new" }],
      fallback: [],
    });
  });

  it("keeps app-kit in transpilePackages when the app lists others", () => {
    expect(defineAppConfig({ apiUrl: API, dev: false }, { transpilePackages: ["other-lib"] }).transpilePackages)
      .toEqual(["@sjolystinnovation/app-kit", "other-lib"]);
  });

  it("escapes a path with its own headers in the page pattern", async () => {
    const config = defineAppConfig({ apiUrl: API, dev: false, pathHeaders: [{ source: "/feed.xml", headers: [] }] });
    expect((await config.headers!())[1]!.source).toBe("/((?!feed\\.xml).*)");
  });
});

describe("the entry point", () => {
  it("imports nothing but Next's types, so next.config.ts can load it", () => {
    const source = readFileSync(join(__dirname, "../../next-config/index.ts"), "utf8");
    const imports = [...source.matchAll(/^import .*$/gm)].map(m => m[0]);
    expect(imports).toEqual(['import type { NextConfig } from "next";']);
    expect(source).not.toContain('"use client"');
  });
});
