import { PHASE_PRODUCTION_BUILD } from "next/constants";

/** A response from `publicGetWithMeta`, with its `Last-Modified` date. */
export interface PublicResponse<T> {
  data: T;
  /** The date from the `Last-Modified` header, when the endpoint reports one. */
  lastModified: Date | null;
}

/** Options for one public GET. */
export interface PublicGetOptions {
  /** The cache tags, so a revalidate route can purge this fetch by tag. */
  tags?: string[] | undefined;
}

/** Options for `createPublicApi`. */
export interface PublicApiOptions {
  /** The seconds a cached response stays fresh. Defaults to `60`. */
  revalidate?: number | undefined;
  /**
   * Whether a failed fetch gives `null` with a warning, in place of `PublicApiError`, while
   * `next build` prerenders. The page then builds empty and ISR fills it on its first revalidate.
   * Outside the build a failure still throws. Defaults to `false`.
   */
  nullOnFailureDuringBuild?: boolean | undefined;
}

/** Thrown when the API could not be reached, or answered with no usable content. */
export class PublicApiError extends Error {
  readonly path: string;
  readonly status: number | null;

  constructor(path: string, status: number | null, options?: { cause?: unknown }) {
    super(`GET ${path} failed${status == null ? "" : ` with ${status}`}`, options);
    this.name = "PublicApiError";
    this.path = path;
    this.status = status;
  }
}

/** Reads `Last-Modified`, ignoring a header that is missing or not a date. */
function lastModifiedOf(response: Response): Date | null {
  const header = response.headers.get("last-modified");
  if (!header) return null;
  const date = new Date(header);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Creates cached GETs against the API's anonymous endpoints, for server components and route
 * handlers.
 *
 * A 404 returns null. An unreachable or failing API throws `PublicApiError`, so a failed fetch is
 * never cached as an empty page in place of a working one. With `nullOnFailureDuringBuild`, a
 * failure during `next build` gives null instead, so the build does not depend on the API.
 */
export function createPublicApi(baseUrl: string, options: PublicApiOptions = {}) {
  if (!baseUrl) {
    throw new Error("createPublicApi needs the API base URL, and baseUrl is empty.");
  }
  const revalidate = options.revalidate ?? 60;
  const base = new URL(baseUrl);
  const basePath = base.pathname.replace(/\/$/, "");

  // The path is joined onto the base URL. A path that does not start with a single "/" is a bug in
  // the caller, so it throws. A path with a dot segment, often a slug from the URL, names no resource,
  // so it gives null, the same as a 404. Pass a slug through encodeURIComponent first.
  function urlFor(path: string): string | null {
    if (!path.startsWith("/") || path.startsWith("//")) {
      throw new Error(`Public API path must start with a single "/" under the base URL: ${path}`);
    }
    const segments = path.split(/[?#]/, 1)[0]!.replace(/%2e/gi, ".").split("/");
    if (segments.some((segment) => segment === "." || segment === "..")) return null;
    const url = new URL(`${baseUrl.replace(/\/$/, "")}${path}`);
    if (url.origin !== base.origin || !url.pathname.startsWith(`${basePath}/`)) return null;
    return url.toString();
  }

  async function publicGetWithMeta<T>(path: string, opts: PublicGetOptions = {}): Promise<PublicResponse<T> | null> {
    try {
      return await fetchWithMeta<T>(path, opts);
    } catch (error) {
      // Read at call time, since next build sets the phase for the process that prerenders.
      if (!options.nullOnFailureDuringBuild || !(error instanceof PublicApiError) || process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
        throw error;
      }
      console.warn(`${error.message} during next build. The page builds without it until it revalidates.`);
      return null;
    }
  }

  async function fetchWithMeta<T>(path: string, opts: PublicGetOptions): Promise<PublicResponse<T> | null> {
    const url = urlFor(path);
    if (url == null) return null;
    let response: Response;
    try {
      response = await fetch(url, {
        next: opts.tags ? { revalidate, tags: opts.tags } : { revalidate },
      });
    } catch (cause) {
      throw new PublicApiError(path, null, { cause });
    }

    if (response.status === 404) return null;
    if (!response.ok) throw new PublicApiError(path, response.status);

    try {
      return { data: (await response.json()) as T, lastModified: lastModifiedOf(response) };
    } catch (cause) {
      throw new PublicApiError(path, response.status, { cause });
    }
  }

  /** Gets the data alone. Returns null when the resource does not exist. */
  async function publicGet<T>(path: string, opts: PublicGetOptions = {}): Promise<T | null> {
    return (await publicGetWithMeta<T>(path, opts))?.data ?? null;
  }

  /** Gets data a page can do without. Returns null when the API fails, so the page still renders. */
  async function publicGetOptional<T>(path: string, opts: PublicGetOptions = {}): Promise<T | null> {
    try {
      return await publicGet<T>(path, opts);
    } catch (error) {
      if (error instanceof PublicApiError) return null;
      throw error;
    }
  }

  return { publicGet, publicGetOptional, publicGetWithMeta };
}
