export interface PublicResponse<T> {
  data: T;
  /** From the `Last-Modified` header, when the endpoint reports one. */
  lastModified: Date | null;
}

export interface PublicGetOptions {
  /** Cache tags, so a revalidate route can purge this fetch by tag. */
  tags?: string[] | undefined;
}

export interface PublicApiOptions {
  /** Seconds a cached response stays fresh. Defaults to 60. */
  revalidate?: number | undefined;
}

/** The API could not be reached, or answered with no usable content. */
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
 * Cached GETs against the API's anonymous endpoints, for server components and route handlers.
 *
 * A 404 gives null. An unreachable or failing API throws `PublicApiError`, so a failed fetch is
 * never cached as an empty page in place of a working one.
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
  // so it gives null, the same as a 404. A slug goes through encodeURIComponent first.
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

  /** The data alone. Null when the resource does not exist. */
  async function publicGet<T>(path: string, opts: PublicGetOptions = {}): Promise<T | null> {
    return (await publicGetWithMeta<T>(path, opts))?.data ?? null;
  }

  /** For data a page can do without. Null on any failure, so the page still renders. */
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
