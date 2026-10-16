import type { NextConfig } from "next";

/** A response header, as `next.config.ts` lists them. */
export interface Header {
  key: string;
  value: string;
}

/** Gets the API's origin, such as `https://api.example.com`. Returns `""` when the URL is missing or invalid. */
export function apiOrigin(apiUrl: string | undefined): string {
  if (!apiUrl) return "";
  try {
    return new URL(apiUrl).origin;
  } catch {
    return "";
  }
}

/** Gets the API's base URL with its path, such as `https://api.example.com/api`, without a trailing slash. Returns `""` when the URL is missing or invalid. */
export function apiBaseUrl(apiUrl: string | undefined): string {
  if (!apiUrl) return "";
  try {
    return new URL(apiUrl).toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

/** Options for `contentSecurityPolicy` and `securityHeaders`. */
export interface CspOptions {
  /** The app's API URL, usually `process.env.NEXT_PUBLIC_API_URL`. The policy allows fetches to its origin. */
  apiUrl: string | undefined;
  /** Whether this is a development build. A development build also allows `'unsafe-eval'`, which hot reload needs. */
  dev: boolean;
  /** Whether to also allow `ws:` and `wss:` to the API, for a WebSocket such as SignalR. */
  websocket?: boolean | undefined;
  /** Whether to also allow images from the API origin. You do not need it when images go through the content images rewrite. */
  imgFromApi?: boolean | undefined;
  /** The extra sources for `connect-src`. */
  connectSrc?: readonly string[] | undefined;
  /** The extra sources for `img-src`. */
  imgSrc?: readonly string[] | undefined;
  /** The sources for `frame-src`. Defaults to `'none'`, since no page embeds a frame. */
  frameSrc?: readonly string[] | undefined;
  /** The sources for `object-src`. Defaults to `'none'`, since no page embeds an object. */
  objectSrc?: readonly string[] | undefined;
}

const sources = (list: readonly (string | false | undefined)[]) => list.filter(Boolean).join(" ");

/**
 * Builds the Content-Security-Policy for an app's pages. Scripts allow `'unsafe-inline'`, because a
 * nonce would make every statically rendered page dynamic.
 */
export function contentSecurityPolicy(o: CspOptions): string {
  const origin = apiOrigin(o.apiUrl);
  const wsOrigin = o.websocket ? origin.replace(/^https:/, "wss:").replace(/^http:/, "ws:") : "";
  return [
    "default-src 'self'",
    o.dev ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${sources(["'self'", o.imgFromApi && origin, "data:", "blob:", ...(o.imgSrc ?? [])])}`,
    `connect-src ${sources(["'self'", origin, wsOrigin, ...(o.connectSrc ?? [])])}`,
    `frame-src ${sources(o.frameSrc ?? ["'none'"])}`,
    `object-src ${sources(o.objectSrc ?? ["'none'"])}`,
    "font-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** Builds the security headers for an app's pages, including the Content-Security-Policy. */
export function securityHeaders(o: CspOptions & { permissionsPolicy?: string | undefined }): Header[] {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "Permissions-Policy", value: o.permissionsPolicy ?? "camera=(), microphone=(), geolocation=()" },
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    { key: "Content-Security-Policy", value: contentSecurityPolicy(o) },
  ];
}

/**
 * Builds the rewrite that proxies content images, so the browser never contacts the API host. It is
 * a rewrite rather than a route handler, so the query string and the Accept header, which webp
 * needs, pass through. Returns no rewrite when the API URL is missing or invalid.
 */
export function contentImagesRewrite(apiUrl: string | undefined, o: { source?: string | undefined; upstreamPath?: string | undefined } = {}) {
  const base = apiBaseUrl(apiUrl);
  if (!base) return [];
  const source = o.source ?? "/content-images";
  const upstream = o.upstreamPath ?? "/content-images";
  return [{ source: `${source}/:path*`, destination: `${base}${upstream}/:path*` }];
}

/** Options for `defineAppConfig`. */
export interface AppConfigOptions extends CspOptions {
  /** Whether to proxy `/content-images/*` to the API. See `contentImagesRewrite`. */
  contentImages?: boolean | undefined;
  /**
   * The headers for particular paths. Every path gets the page headers, and these come after them,
   * so they replace a page header of the same name.
   */
  pathHeaders?: readonly { source: string; headers: Header[] }[] | undefined;
  /** A Permissions-Policy that replaces the default one. */
  permissionsPolicy?: string | undefined;
  /**
   * The number of seconds a cache may go on serving a page after it goes stale. Next's default is a
   * year, long enough for a browser to hand back an old page and fetch the current one behind it.
   * Defaults to `300`, matching the client router cache's stale time.
   */
  expireTime?: number | undefined;
  /**
   * Whether to write revalidated pages to disk. Defaults to `false`. With a read-only root
   * filesystem, Next cannot write to `.next/server/app`, so the incremental cache stays in memory.
   */
  isrFlushToDisk?: boolean | undefined;
}

/**
 * Builds the shared Next config for an app: the standalone build, app-kit transpiled, no
 * `X-Powered-By`, the security headers on every page, and optionally the content images rewrite.
 * `extra` is merged over it, with `transpilePackages` and `images` combined.
 */
export function defineAppConfig(o: AppConfigOptions, extra: NextConfig = {}): NextConfig {
  const pageHeaders = securityHeaders(o);
  const paths = o.pathHeaders ?? [];

  const { transpilePackages, images, experimental, headers: extraHeaders, rewrites: extraRewrites, ...rest } = extra;
  return {
    output: "standalone",
    poweredByHeader: false,
    expireTime: o.expireTime ?? 300,
    ...rest,
    transpilePackages: [...new Set(["@sjolystinnovation/app-kit", ...(transpilePackages ?? [])])],
    images: { qualities: [75, 100], ...images },
    experimental: { isrFlushToDisk: o.isrFlushToDisk ?? false, ...experimental },
    async headers() {
      // Every path gets the page headers. Next lets a later rule replace a header of the same name,
      // so a path's own headers come after them.
      const own = [{ source: "/:path*", headers: pageHeaders }, ...paths.map(p => ({ source: p.source, headers: p.headers }))];
      return [...own, ...((await extraHeaders?.()) ?? [])];
    },
    async rewrites() {
      const own = o.contentImages ? contentImagesRewrite(o.apiUrl) : [];
      const more = await extraRewrites?.();
      if (!more) return own;
      if (Array.isArray(more)) return [...own, ...more];
      return { ...more, afterFiles: [...own, ...(more.afterFiles ?? [])] };
    },
  };
}
