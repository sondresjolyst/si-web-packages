import type { NextConfig } from "next";
import { contentImagesRewrite, securityHeaders, type CspOptions, type Header } from "./headers";

export type { CspOptions } from "./headers";

/** Options for `defineAppConfig`. */
export interface AppConfigOptions extends CspOptions {
  /**
   * Whether to proxy `/content-images/*` to the API. The rewrite keeps the browser off the API host
   * and passes the query string and the Accept header through.
   */
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
