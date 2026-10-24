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

/** The Content-Security-Policy options for `defineAppConfig`. */
export interface CspOptions {
  /** The app's API URL, usually `process.env.NEXT_PUBLIC_API_URL`. The policy allows fetches to its origin. */
  apiUrl: string | undefined;
  /** Whether this is a development build. A development build also allows `'unsafe-eval'`, which hot reload needs. */
  dev: boolean;
  /** Whether to also allow `ws:` and `wss:` to the API, for a WebSocket such as SignalR. */
  websocket?: boolean | undefined;
  /** Whether to also allow images from the API origin. You do not need it when images go through the content images rewrite. */
  imgFromApi?: boolean | undefined;
  /** The extra sources for `script-src`, such as a script an app loads after consent. */
  scriptSrc?: readonly string[] | undefined;
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
    `script-src ${sources(["'self'", o.dev && "'unsafe-eval'", "'unsafe-inline'", ...(o.scriptSrc ?? [])])}`,
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
