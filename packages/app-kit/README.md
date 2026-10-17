# @sjolystinnovation/app-kit

[![npm](https://img.shields.io/npm/v/@sjolystinnovation/app-kit.svg)](https://www.npmjs.com/package/@sjolystinnovation/app-kit)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

> Building blocks for Next.js apps that sign in against a JWT API through next-auth

Several apps sharing one API also share the code around it:

- the session plumbing
- how a failed request becomes a message a user can read
- the form controls on the sign-in page

This package holds that code once, and each app installs it.

## Install

```sh
npm install @sjolystinnovation/app-kit
```

The package ships TypeScript source, so add it to `transpilePackages`:

```ts
// next.config.ts
const nextConfig: NextConfig = {
  transpilePackages: ["@sjolystinnovation/app-kit"],
};
```

The components in `@sjolystinnovation/app-kit/ui`, `admin`, `legal`, `markdown`, `sections`, `branding`,
`payments`, and `session/react` use Tailwind CSS. Import the package's stylesheet after Tailwind:

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "@sjolystinnovation/app-kit/styles.css";
```

## Usage

Declare the values that differ between apps once, then pass that config wherever you need it. One
app can define it, or several apps can each define their own.

```ts
// src/lib/session.ts
import { defineSessionConfig } from "@sjolystinnovation/app-kit";

export const sessionConfig = defineSessionConfig({
  jwtSecretEnvVar: "API_JWT_SECRET",
  loginRoute: "/en/login",
  draftStoragePrefix: "example",
});
```

The root entry point holds only `defineSessionConfig`, `requireEnv`, and `SessionConfig`. It
imports no peer dependency, so it works in browser code, server code, and `next.config.ts`.

## API

### `SessionConfig`

| Property | Type | Description |
| --- | --- | --- |
| `jwtSecretEnvVar` | `string` | Name of the environment variable holding the API JWT secret, such as `API_JWT_SECRET`. |
| `loginRoute` | `string` | Where an expired session sends the browser, such as `/en/login` or `/login`. |
| `draftStoragePrefix` | `string` | Bare name for the `localStorage` keys holding form drafts, such as `example`. Drafts are stored under `example:draft:<owner>:<scope>`. |

### `defineSessionConfig(config)`

`(config: SessionConfig) => SessionConfig`

Returns the config unchanged, so TypeScript checks its shape once, where it is declared. Throws
when `draftStoragePrefix` is empty or contains a colon.

### `requireEnv(name, value)`

`(name: string, value: string | undefined) => string`

Returns `value`, or throws `Missing <name>.` when it is unset or empty. Pass the value read in
place, such as `process.env.NEXT_PUBLIC_API_URL`, so Next.js can inline a public variable at build
time.

### `formatApiError(error, fallback, statusMessages?)`

`(error: unknown, fallback: string, statusMessages?: StatusMessages) => string`

From `@sjolystinnovation/app-kit/api`. Turns a failed request into one line a user can read.

On a 4xx response, it uses the first of these:

1. The body's own message: a text body, such as the one `BadRequest("...")` sends from ASP.NET Core,
   or `message`, the first validation error, or `detail` from a JSON body.
2. The entry in `statusMessages` for the status.
3. `fallback`.

On a 5xx response, the entry in `statusMessages` comes first, then the body, then `fallback`. A 5xx
body can come from a proxy, such as "Bad Gateway", so the caller's own words win when it has them.

The function never shows a problem details `title`. ASP.NET Core fills it with generic text, such
as "Bad Request" or "An error occurred while processing your request.", which says less than
`fallback`.

A few more rules:

- Key `0` in `statusMessages` covers a request that got no response, because of a dropped
  connection or a timeout.
- Only text on a single line counts as a message.
- The function never shows Axios's own message, such as "Request failed with status code 500".
- A canceled request gives `fallback`.
- Any other `Error` gives its own message.
- The function does not read a body requested as an `arraybuffer` or a `blob`, as for a file
  download. A failed download gets `statusMessages` or `fallback`.

```ts
import { formatApiError } from "@sjolystinnovation/app-kit/api";

try {
  await api.post("/users", form);
} catch (error) {
  setError(formatApiError(error, "Could not create the user.", { 409: "That email is taken." }));
}
```

### `createAuthOptions(config, settings)`

From `@sjolystinnovation/app-kit/auth`. Server only. Builds the next-auth options for an app that
signs in against the API with email and password:

```ts
// src/lib/authOptions.ts
import { requireEnv } from "@sjolystinnovation/app-kit";
import { createAuthOptions } from "@sjolystinnovation/app-kit/auth";
import { sessionConfig } from "@/lib/session";

export const authOptions = createAuthOptions(sessionConfig, {
  apiUrl: requireEnv("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL),
  env: process.env,
});
```

```ts
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

| Setting | Type | Description |
| --- | --- | --- |
| `apiUrl` | `string` | Base URL of the API. Sign-in posts to `/auth/login`, refresh to `/auth/refresh-token`, and sign-out to `/auth/logout` under it. An empty value throws. |
| `env` | `Record<string, string \| undefined>` | The server environment, usually `process.env`. It supplies the secret named by `jwtSecretEnvVar`. |
| `http` | `AxiosInstance` | The client for sign-in and refresh, with its own base URL. Use it in place of `apiUrl`, for tests. |

next-auth reads `NEXTAUTH_SECRET` itself and refuses to run in production without it.

What the options do:

- **Sign-in** posts `{ email, password }` and expects `{ token, refreshToken }`. It verifies the
  access token with the API JWT secret and allows 60 seconds of clock difference between the server
  and the API. Its `sub`, `unique_name`, and `role` claims become the user's `id`, `name`, and
  `roles`. The log gets the status, error code, and message, never the request. If sign-in fails,
  next-auth's `error` holds one of these:
  - `SIGN_IN_ERRORS.unavailable` when the API does not answer, or a gateway returns 502, 503, or
    504.
  - `SIGN_IN_ERRORS.invalidCredentials` for every other failure, including an unreadable token and
    an answer without both tokens.
- **Refresh** runs ahead of expiry: five minutes before it, or a quarter of the token's lifetime
  before it when that is shorter. The options never schedule it sooner than 30 seconds out, so a
  token that lives under 30 seconds gets its refresh after it expires. Parallel reads of one session
  in one server process share a single refresh. The options keep its answer for a minute, because
  the API rotates the refresh token on every call.
- **Failures:** a 400 or 401 from the refresh ends the session with `RefreshTokenRejected`. Any
  other failure keeps it and tries again a minute later. A session without a refresh token ends with
  `NoRefreshToken` when its refresh falls due.
- **Cap:** the session ends seven days after sign-in with `AbsoluteSessionExpired`, however recently
  it was refreshed.
- **Session:** it carries `user`, `accessToken`, `error`, and `absoluteExpiresAt`, the end of the
  seven days in milliseconds.
- **Sign-in page:** `pages.signIn` is `config.loginRoute`.

Follow two rules so that you never lose a refresh:

- Read the session on the client, through `useSession` or `getSession`. In the App Router,
  `getServerSession(authOptions)` cannot store a cookie in server components, route handlers, or
  server actions. A refresh there replaces the tokens at the API and loses the new ones. The
  next refresh then reuses the old token, and the API revokes every session the user has. On the
  server, read the token with `getToken` from `next-auth/jwt`, which never refreshes.
- Run the app as one server process. Parallel session reads share one refresh only within a process.
  Two replicas can refresh the same token at once, with the same result.

The package declares these fields on next-auth's types in `@sjolystinnovation/app-kit/next-auth`.
Load the declarations once, from one of the app's own `.d.ts` files, so its code can read them:

```ts
// src/types/next-auth.d.ts
import "@sjolystinnovation/app-kit/next-auth";
```

The session carries `user` (`id`, `name`, `email`, `roles`), `accessToken`, `error`, and
`absoluteExpiresAt`. The token carries `accessToken`, `refreshToken`, `refreshAt`, `loginAt`,
`user`, and `error`.

### `@sjolystinnovation/app-kit/api`

`createApiClient(baseURL)` returns an axios instance for the signed-in API, for code that runs in
the browser. It reads the session through next-auth's `getSession`, which has no cookies to read on
the server. An empty `baseURL` throws. Each request carries the session's access token. When the
session is gone or has a terminal error, a 401 opens the re-sign-in prompt. It does not sign the
user out, so the page keeps its state. The error still rejects as usual.

`request(call, fallback, statusMessages?)` runs a call and returns its `data`. A failure becomes an
`Error` with the message `formatApiError` gives it. When the API answers with a validation problem,
the error also keeps its per-field messages and their codes for `apiFieldErrors` and for the
field errors of the shared forms. It keeps nothing else from the response. A canceled call rethrows the cancel unchanged:

```ts
import { requireEnv } from "@sjolystinnovation/app-kit";
import { createApiClient, request } from "@sjolystinnovation/app-kit/api";

const api = createApiClient(requireEnv("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL));

export const getRecipe = (id: number) =>
  request(() => api.get<Recipe>(`/recipes/${id}`), "Could not load the recipe.");
```

`mergeCompanyInfo(data, fallback)` gives the company details for public pages: the API's
`/company` answer, with the app's own value for each field it left blank or could not give. Only
the fallback's name is required. The legal name falls back to the name, and VAT to not registered.
`formatOrgNumber({ orgNumber, vatRegistered })` adds ` MVA` once the business is VAT registered,
and gives an empty string without a number.

```ts
// src/lib/companyInfo.ts
export const getCompanyInfo = async () => mergeCompanyInfo(await publicGetOptional<CompanyInfo>("/company"), COMPANY);
```

`apiFieldErrors(error)` reads the per-field messages of an ASP.NET validation problem from a failed
call, its body, or the `Error` that `request` and the services throw, keyed in camelCase to match
the form: `{ errors: { OrgNumber: ["..."] } }` becomes `{ orgNumber: ["..."] }`. It returns `null`
when there are none, so the form falls back to one message.

```ts
try {
  await SettingsService.update(settings);
} catch (err) {
  setFieldErrors(apiFieldErrors(err) ?? {});
  toast.error(err instanceof Error ? err.message : "Could not save.");
}
```

`createPublicClient(baseURL)` is the same without the session, for the API's anonymous endpoints. An
empty `baseURL` throws, and requests only go to `baseURL`.

The services below call the endpoints that the SjolystInnovation.AppKit .NET packages map, so you
do not write them in the app. `api` is a `createApiClient` instance, and `publicApi` is a
`createPublicClient` one.
Failures throw an `Error` with the API's message, or with the service's own English fallback.
`onSaved` runs after a save succeeds, such as `() => revalidateTarget("branding")`. Here
`revalidateTarget` is the `revalidate` that
[`defineRevalidateTargets`](#sjolystinnovationapp-kitserver) returns. It posts the target to
the app's revalidate route and never throws. On failure, the pages' own revalidate window is the
fallback.

`invite` takes `{ email, firstName, lastName, role }`. `save` takes
`{ key, locale, title, bodyMarkdown }`.

| Factory | Methods | .NET package |
| --- | --- | --- |
| `createUserService(api, publicApi)` | `requestPasswordReset`, `resetPassword`, and for the signed-in user `getProfile`, `updateProfile`, `changePassword`, `exportData`, and `deleteAccount` | Auth |
| `createAdminUsersService(api)` | `getUsers(includeDeleted?)`, `addRole`, `removeRole`, `deleteUser`, and `invite` | Auth |
| `createSettingsService(api, { onSaved? })` | `get`, `update` | SiteSettings |
| `createBrandingService(api, publicApi, { onSaved? })` | `get`, which answers `{}` when the API cannot be read, and `update(form)` | SiteSettings |
| `createLegalService<Key>(api, publicApi, { onSaved? })` | `get(key, locale)`, which answers `null` for a missing page, `listAll`, and `save` | SiteSettings |

```ts
import { createApiClient, createPublicClient, createUserService } from "@sjolystinnovation/app-kit/api";

const apiUrl = requireEnv("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL);
export default createUserService(createApiClient(apiUrl), createPublicClient(apiUrl));
```

The package also exports the response types: `UserProfile`, `AdminUser`, `SiteSettings`, and
`LegalPage`.

### `@sjolystinnovation/app-kit/server`

For server components and route handlers only. It imports `next/cache` and `next/server`.

`createPublicApi(baseUrl, options?)` returns cached GETs against the API's anonymous endpoints:

- `publicGet(path, { tags? })` gives the data, or `null` when the API answers 404. An unreachable or
  failing API throws `PublicApiError`, so a failed fetch is never cached as an empty page in place
  of a working one.
- `publicGetOptional(path, { tags? })` gives `null` on any failure, for data a page can do without.
- `publicGetWithMeta(path, { tags? })` also gives `lastModified`, from the `Last-Modified` header.

Responses stay fresh for 60 seconds unless `options.revalidate` says otherwise. An empty `baseUrl`
throws. Each path starts with a single `/`, or the call throws. A path with a `.` or `..` segment,
encoded or not, gives `null` without a request, the same as a 404. Run a slug or other user input
through `encodeURIComponent` before putting it in a path.

```ts
// src/lib/publicApi.ts
import { requireEnv } from "@sjolystinnovation/app-kit";
import { createPublicApi } from "@sjolystinnovation/app-kit/server";

export const { publicGet, publicGetOptional, publicGetWithMeta } = createPublicApi(
  requireEnv("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL),
);
```

`createRevalidateRoute({ targets, role })` returns a `POST` handler for `app/api/revalidate/route.ts`.
Each target maps to the page paths it purges. A path with a dynamic segment, such as
`/builds/[slug]`, purges every page of that route. The route also purges the target name as a cache
tag, so tag the fetches behind it with the same name. The handler answers 403 unless the caller has
a live session with `role`: signed in within the last seven days, with no refused refresh, and with
an access token that has not expired. It answers 415 unless the caller sends the body as JSON,
which the `revalidate` from `defineRevalidateTargets` does. It answers 400 for a target it does not know.

```ts
// src/app/api/revalidate/route.ts
import { createRevalidateRoute } from "@sjolystinnovation/app-kit/server";

export const POST = createRevalidateRoute({
  role: "Admin",
  targets: { builds: ["/builds", "/builds/[slug]", "/sitemap.xml"], legal: ["/terms", "/privacy"] },
});
```

`defineRevalidateTargets({ locales, targets })`, from `@sjolystinnovation/app-kit/api`, keeps the
targets in one file that both sides import. `pages` are below each locale segment, and `root` paths
are not. It returns `targets` for fetch tags, `paths` for the route, and `revalidate(target)` for
the admin services.

```ts
// src/lib/cacheTags.ts
export const { targets: REVALIDATE_TARGETS, paths: TARGET_PATHS, revalidate: revalidateTarget } = defineRevalidateTargets({
  locales: LOCALES,
  targets: {
    legal: { pages: ["/terms", "/privacy", "/cookies"], root: ["/sitemap.xml"] },
    // Every page renders branding through the layout, so its tag reaches them all.
    branding: {},
  },
});

// src/app/api/revalidate/route.ts
export const POST = createRevalidateRoute({ targets: TARGET_PATHS, role: ADMIN_ROLE });
```

### `@sjolystinnovation/app-kit/next-config`

For `next.config.ts`. It imports nothing but Next's types, so Next loads it with no build step.

`defineAppConfig(options, extra?)` gives the config every app shares: the standalone build, app-kit
in `transpilePackages`, no `X-Powered-By`, `expireTime` of five minutes, image qualities 75 and 100,
the incremental cache in memory, and the security headers on every page. It merges `extra` over
that config and combines `transpilePackages`, `images`, `experimental`, `headers`, and `rewrites`
rather than replacing them.

```ts
// next.config.ts
import { defineAppConfig } from "@sjolystinnovation/app-kit/next-config";

export default defineAppConfig({
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  dev: process.env.NODE_ENV !== "production",
  contentImages: true,
});
```

| Option | Type | Description |
| --- | --- | --- |
| `apiUrl` | `string \| undefined` | The API URL. Its origin is allowed in `connect-src`. |
| `dev` | `boolean` | Development builds also allow `'unsafe-eval'`, which hot reload needs. |
| `websocket` | `boolean` | Also allow `ws:` and `wss:` to the API origin, for SignalR. |
| `imgFromApi` | `boolean` | Also allow images from the API origin. Not needed with `contentImages`. |
| `contentImages` | `boolean` | Proxy `/content-images/*` to the API's `/content-images/*`, so the browser never contacts the API host. |
| `connectSrc`, `imgSrc` | `string[]` | Extra sources for those directives. |
| `frameSrc`, `objectSrc` | `string[]` | Sources for those directives. Both default to `'none'`. |
| `pathHeaders` | `{ source, headers }[]` | Headers for particular paths, such as a file download. They come after the page headers and replace a page header of the same name. Every path keeps the rest. |
| `permissionsPolicy` | `string` | Replaces `camera=(), microphone=(), geolocation=()`. |
| `expireTime` | `number` | Seconds a cache may serve a stale page. Defaults to 300. Next's default is a year. |
| `isrFlushToDisk` | `boolean` | Write revalidated pages to disk. Off by default, for a read-only root filesystem. |

Scripts allow `'unsafe-inline'`, since a nonce would make every statically rendered page dynamic.

### `@sjolystinnovation/app-kit/markdown`

Renders Markdown from an editor or the API, with GitHub tables, task lists, and footnotes. It never
renders raw HTML and sanitizes the output, so the text cannot inject scripts, styles, event
handlers, or `javascript:` links. It works in a server component. It needs `react-markdown`,
`remark-gfm`, and `rehype-sanitize`, which are optional peer dependencies:

```sh
npm install react-markdown remark-gfm rehype-sanitize
```

```tsx
import { Markdown } from "@sjolystinnovation/app-kit/markdown";

<div className="space-y-4 text-sm text-gray-700">
  <Markdown>{build.description}</Markdown>
</div>;
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `string \| null \| undefined` | | The Markdown. Empty, `null`, or `undefined` renders nothing. |
| `components` | `Components` | | Replaces the element for a tag, such as `{ p: MyParagraph }`. Tags not named keep the default. It gets the props without `node`, so it can spread them onto an element. |
| `externalLinks` | `boolean` | `false` | Opens `http` and `https` links in a new tab with `rel="noopener noreferrer"`. Site-relative links stay in the tab. |
| `className` | `string` | | Wraps the output in a `div` with these classes. Without it the elements render bare, so a parent's `space-y-*` spaces them. |

The text takes its color and size from the parent. A level one heading becomes a level two, since
the page has its own `h1`.

### `@sjolystinnovation/app-kit/seo`

Search engine helpers for one site: canonical URLs with hreflang, page metadata with Open Graph,
sitemap entries, `robots.txt`, and schema.org structured data. It works in a server component.
`defineSite` binds them to the site's name, canonical origin, and locales:

```ts
// src/lib/seo/site.ts
import { defineSite } from "@sjolystinnovation/app-kit/seo";

export const site = defineSite({
  name: "Altinnendata",
  url: "https://www.altinnendata.no",
  titleSeparator: " | ",
  locales: ["no", "en"],
  defaultLocale: "no",
  localeTags: { no: "no", en: "en" },
  tagline: locale => getDictionary(locale).meta.tagline,
});
```

| Option | Type | Description |
| --- | --- | --- |
| `name` | `string` | The site's name, in titles, Open Graph, and structured data. |
| `url` | `string` | The canonical origin, without a trailing slash. |
| `titleSeparator` | `string` | Between a page title and the site name. |
| `locales` | `string[]` | The locale segments every page is under. A site without them leaves it out, and its paths have no segment. |
| `defaultLocale` | `string` | The locale `x-default` points at. Defaults to the first. |
| `localeTags` | `Record<locale, string>` | The BCP 47 tag per locale. Defaults to the locale. |
| `tagline` | `(locale) => string` | The line after the name in the default title and the share image's alt text. |
| `shareImagePath` | `string` | The share image route below each locale. Defaults to `/og`. |

The site provides:

- `localePath(locale, path)`, `absoluteUrl(path)`, `absoluteLocaleUrl(locale, path)` and
  `languageAlternates(path)`. Paths get a leading slash and no trailing slash.
- `siteMetadata({ locale, description, manifest })` for the locale root layout: the title
  template, `metadataBase`, the index directive, and the front page's canonical.
- `pageMetadata({ locale, path, title, description, images })` for a page: the canonical URL,
  hreflang, and Open Graph with the locale's share image unless `images` is given.
- `localeEntries(path, { locales, lastModified })` for `sitemap.ts`: one entry per locale, each
  listing the others. It leaves out `lastModified` when that is unknown. A site without locales
  gets one entry per page.
- `forEachLocale(load)` runs `load` for every locale at once and keys the results by locale.
- `legalEntries({ keys, updatedAt })` gives the legal pages' entries, `/terms`, `/privacy` and
  `/cookies` unless `keys` says otherwise, each dated by the timestamp `updatedAt` returns for it.
- `robots({ privatePaths, privateRootPaths, indexable })` for `robots.ts`. It disallows the private
  paths under every locale segment. A deployment that is not production disallows everything.
- `organizationNode(company, { type, sameAs, country, image, logo })`, `webSiteNode(locale)`,
  `breadcrumbNode(crumbs, pageUrl)`, `itemListNode(paths, pageUrl)`, `siteId(fragment)`, and `ids`
  for structured data.

```tsx
// src/app/robots.ts
export const dynamic = "force-dynamic";
export default () => site.robots({ privatePaths: ["/admin", "/login"], privateRootPaths: ["/api/"] });

// src/app/sitemap.ts
export const revalidate = 3600;
export default async () => [
  ...site.localeEntries(""),
  ...(await site.legalEntries({
    updatedAt: async (key, locale) => (await publicGet<LegalPage>(`/content/legal/${key}?locale=${locale}`))?.updatedAt,
  })),
];

// in a page
<JsonLd nodes={[site.organizationNode(company), site.webSiteNode(locale)]} />
```

`isIndexableEnvironment()` reads `SITE_ENV`. `prod`, `production`, and unset or blank count as
production, so a missing variable never deindexes the live site. `robots.ts` needs
`dynamic = "force-dynamic"`, so it reads the variable per request. The package also exports
`JsonLd`, `serializeGraph`, `ref`, `NOINDEX`, `LEGAL_PAGE_KEYS`, `SHARE_IMAGE_SIZE`, `latest`, and
`parseTimestamp`.

### `@sjolystinnovation/app-kit/seo/og`

`shareImage({ name, tagline, colors })` renders the default share preview, a PNG at
`SHARE_IMAGE_SIZE`: the name, a bar in `colors.primary`, and the tagline. The colors are literals,
since the image renders outside the browser. Return it from the route `pageMetadata` points at:

```tsx
// src/app/[locale]/og/route.tsx
import { shareImage } from "@sjolystinnovation/app-kit/seo/og";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return shareImage({ name: site.name, tagline: getDictionary(locale).meta.tagline, colors: BRAND });
}
```

It is a route rather than the `opengraph-image` file convention, since a page's own `openGraph`
block replaces that image.

### `@sjolystinnovation/app-kit/branding`

The logo and favicon an admin uploads, as the API's `/branding` endpoint returns them.

`BrandingProvider` holds them for the components below it. It takes the branding the server
rendered with, loads it on mount when there is none, and loads it again every five minutes, so an
open tab picks up a change. A failed load keeps what it has. `useBranding()` gives `branding`,
`logoUrl` as a `data:` URL or `null`, and `refresh()`.

```tsx
"use client";
import { BrandingProvider, useBranding } from "@sjolystinnovation/app-kit/branding";

<BrandingProvider load={BrandingService.get} initial={initialBranding}>{children}</BrandingProvider>;

const { logoUrl } = useBranding();
<img src={logoUrl ?? "/logo.png"} alt="" />;
```

`BrandingManager` is the admin form for uploading or removing them. It needs a `BrandingProvider`
above it, and refreshes it after a save. If the API refuses a file, the form shows the reason under
that image and toasts it. A successful save clears it. `strings.validation` holds the text for each
refusal code that SjolystInnovation.AppKit.SiteSettings sends for a file: `invalidImage` and
`imageTooLarge`. A code the app leaves out keeps its English default. For an unknown code, or an API
that sends no codes, the form shows the API's message.

```tsx
<BrandingManager save={form => BrandingService.update(form)} />
```

| Prop | Type | Description |
| --- | --- | --- |
| `save` | `(form: FormData) => Promise<unknown>` | Sends `logo` and `icon` files, and `removeLogo` and `removeIcon` set to `true`. Throw to show the error's message. |
| `strings` | `TextOverrides<BrandingManagerStrings>`, with `validation` as `TextOverrides<BrandingValidationStrings>` | The form's text. `validation` may name only some codes. |

### `@sjolystinnovation/app-kit/branding/server`

`brandingIcon({ load, fallbackPath, fallbackType })` is the response for an `app/icon.ts` route:
the favicon set in admin settings when it is a PNG, JPEG, WebP, GIF, or ICO, or the bundled file
otherwise, since an SVG or HTML upload could run script on the site's origin. Both carry `nosniff`
and a sandbox CSP, which a CSP header from the app's `next.config` replaces. If the route cannot
load the branding, it answers 503 with `no-store`, since a browser would cache the bundled icon in
place of the one set in settings.

```ts
// src/app/icon.ts
import { join } from "node:path";
import { brandingIcon } from "@sjolystinnovation/app-kit/branding/server";

export const dynamic = "force-dynamic";

export default function Icon() {
  return brandingIcon({
    load: () => publicGet<Branding>("/branding", { tags: ["branding"] }),
    fallbackPath: join(process.cwd(), "public", "icon.png"),
    fallbackType: "image/png",
  });
}
```

The route needs `dynamic = "force-dynamic"`, or the build bakes in the icon of the moment. Tag the
fetch and revalidate the tag after a save, so a new icon shows at once. `iconVersion(data)` is a
short digest of the icon bytes, for a manifest icon URL such as `/icon?v=<digest>`, since Android
refreshes a home screen icon only when the manifest changes.

### `@sjolystinnovation/app-kit/payments`

The page a user comes back to from a payment provider, such as after approving a Vipps payment or
agreement. The .NET side of the Vipps calls is `SjolystInnovation.AppKit.Vipps` on NuGet.

`usePollUntilFinal(fetcher, isFinal, { retries, delayMs })` fetches until the value is final, since
the provider may confirm a moment after the user is back. It polls every 4 seconds, 8 more times at
most, and stops on a failed fetch and on unmount. It gives `data`, `loading` and `refresh()`, and
each fetch uses the latest `fetcher` and `isFinal`.

`PaymentReturn` shows the outcome: confirmed, still pending, or failed. It takes the text and the way
on for each state. When you pass `onRefresh`, it shows a refresh button while pending.

```tsx
"use client";
import { PaymentReturn, usePollUntilFinal } from "@sjolystinnovation/app-kit/payments";

const { data: order, loading, refresh } = usePollUntilFinal(
  () => ShopService.getOrder(orderId),
  o => o != null && o.status !== "Pending",
);
if (loading) return <Spinner />;

<PaymentReturn
  state={order?.status === "Paid" ? "success" : order?.status === "Pending" ? "pending" : "failed"}
  success={{ title: "Payment received!", body: "Your order is confirmed.", href: "/shop", cta: "Back to shop" }}
  pending={{ title: "Payment pending", body: "Vipps is confirming it.", note: "We'll email a receipt.", href: "/profile/billing", cta: "View billing" }}
  failed={{ title: "Payment failed", body: "No charge was made.", href: "/shop", cta: "Try again" }}
  onRefresh={refresh}
/>;
```

| Prop | Type | Description |
| --- | --- | --- |
| `state` | `"success" \| "pending" \| "failed"` | Which content to show. |
| `success`, `pending`, `failed` | `{ title, body, href, cta, note?, extra? }` | The text, the button's target and text, a smaller note line, and anything more, per state. |
| `onRefresh` | `() => void` | Shows a refresh button while pending. |
| `refreshLabel` | `string` | Its text. Defaults to `Check again`. |
| `className` | `string` | Classes for placing it, on the outer element. |

`formatNok(ore)` formats øre as kroner, such as `NOK 373,75`.

### `@sjolystinnovation/app-kit/admin`

`CompanySettingsForm` is the admin form for the business details the public pages show, saved
through `createSettingsService`. Its children show below the form once the settings have loaded,
such as the `BrandingManager`. `strings` holds every label, hint, and message, English by default.
If the API refuses a save with a validation problem, the form shows each field's error under that
field and toasts the first one. A successful save clears them. `strings.validation` holds the text for
each error code that SjolystInnovation.AppKit.SiteSettings sends: `required`, `tooLong`,
`invalidEmail`, `orgNumberRequiredForVat`, `invalidOrgNumber`, `invalidPostalCode`, and
`placeRequired`. `{max}` in `tooLong` becomes the field's limit. A code the app leaves out keeps its
English default. For an unknown code, or an API that sends no codes, the form shows the API's message.

```tsx
// dict.companySettings.validation: { invalidOrgNumber: "Ikke et gyldig organisasjonsnummer.", tooLong: "Maks {max} tegn.", ... }
<CompanySettingsForm service={SettingsService} strings={dict.companySettings}>
  <BrandingManager save={BrandingService.update} />
</CompanySettingsForm>
```

The admin area. `AdminShell` is the frame: a title and a tab bar above the page, behind a
`RoleGate`. It takes `RoleGate`'s `role`, `fallback`, and `denied` or `deniedHref`. The tab whose
`href` is the current path is active, with `aria-current="page"`.

```tsx
// src/app/[locale]/(protected)/admin/layout.tsx
"use client";
import { AdminShell } from "@sjolystinnovation/app-kit/admin";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { dict, locale } = useDictionary();
  const tabs = [
    { href: `/${locale}/admin/users`, label: dict.admin.users },
    { href: `/${locale}/admin/legal`, label: dict.admin.legal },
  ];
  return (
    <AdminShell role="Admin" title={dict.admin.title} tabs={tabs} deniedHref={`/${locale}`}>
      {children}
    </AdminShell>
  );
}
```

`StatHistoryChart` draws the admin stats over time: a line per series, a scale from zero to the
highest value shown, and legend buttons that hide and show each line. `data` is one row per day,
oldest first, with `date` as `YYYY-MM-DD`. A missing value counts as zero. Each series names the
field it plots and its label, and takes the next color of a built-in palette of five unless it has
its own. `strings` holds `empty`, shown when there are no days, and `chart`, the accessible name.

```tsx
<StatHistoryChart
  data={history}
  series={[
    { key: "totalUsers", label: dict.stats.users },
    { key: "contentImages", label: dict.stats.images },
  ]}
  strings={{ empty: dict.admin.noHistory, chart: dict.admin.overTime }}
/>
```

`AdminUsersPanel` is the users page. It lists every user with their roles, shows deleted users
behind a toggle, gives and takes roles, deletes an account after a confirm, and invites a user by
email. It calls the API through `createAdminUsersService`. `getRoles` returns the roles an admin
may give. You can pass inline functions, because the panel does not fetch again when they change.
It reports with `toast`, so the app needs sonner and a `Toaster`. If the API refuses an invite with a
validation problem, the panel also shows each message under its field.

```tsx
import { AdminUsersPanel } from "@sjolystinnovation/app-kit/admin";

<AdminUsersPanel service={adminUsers} getRoles={AdminService.getRoles} strings={dict.adminUsers} />
```

| Prop | Type | Description |
| --- | --- | --- |
| `service` | `ReturnType<typeof createAdminUsersService>` | The user admin calls. |
| `getRoles` | `() => Promise<string[]>` | The roles an admin may give. |
| `defaultInviteRole` | `string` | The role a new invite starts with. Defaults to `Admin`. |
| `strings` | `TextOverrides<AdminUsersPanelStrings>` | The text, English by default. The panel fills in `{name}` and `{role}` where a text names them. |

`LegalPagesEditor` edits the legal pages one page and one locale at a time, through
`createLegalService`. A locale tab whose page has no content yet gets a dot. `LocaleTabs` is the
same tab bar on its own, for other translated forms. A blank title or content is marked under its
field with `strings.validation.required` and toasts `strings.required`, without calling the API. If
the API refuses a save with a validation problem, the editor shows each error under its field while
that page and locale are open, and toasts the first one. `strings.validation` holds the text for the
codes the API sends for a legal page: `required` and `tooLong`. `{max}` in `tooLong` becomes the
title's limit. A code the app leaves out keeps its English default. For an unknown code, or an API
that sends no codes, the editor shows the API's message.

```tsx
<LegalPagesEditor
  service={LegalService}
  keys={LEGAL_PAGE_KEYS}
  keyLabels={{ terms: dict.footer.terms, privacy: dict.footer.privacy, cookies: dict.footer.cookies }}
  locales={LOCALES}
  localeLabels={LOCALE_LABELS}
  strings={dict.legalEditor}
/>
```

### `@sjolystinnovation/app-kit/legal`

`LegalPageView` renders a terms, privacy or cookies page as an admin wrote it: the title, the date
it last changed in `dateLocale`, and the Markdown body. If there is no page, it shows `title` and
says the page is missing. It is a server component and needs the same peers as `markdown`, but
neither axios nor next-auth. It also exports the `LegalPage` type, the same one as
`@sjolystinnovation/app-kit/api`, so a site without sign-in can type the page without that entry. The
route file stays in the app, since Next reads `revalidate` and the metadata from it.

```tsx
// src/app/[locale]/terms/page.tsx
export const revalidate = 3600;

export default async function TermsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const page = await publicGet<LegalPage>(`/content/legal/terms?locale=${locale}`, { tags: [REVALIDATE_TARGETS.legal] });
  return <LegalPageView page={page} title={dict.footer.terms} homeHref={`/${locale}`} dateLocale="nb-NO" strings={dict.legal} />;
}
```

### `@sjolystinnovation/app-kit/sections`

A home page built from sections an admin edits: the types, a renderer and the admin editor. The
shared types are `hero`, `feature`, `text`, `feed`, `contact`, `cta`, `stats` and `image`. An app
adds its own fields with `Sections<Extensions, LiveStatSources>`, and its own types by adding them
to the union.

```ts
// src/types/content.ts
import { createSectionFactory, type Sections } from "@sjolystinnovation/app-kit/sections";

export type Section = Sections<{ hero: { backgroundImageId: string | null } }, "builds" | "parts">;

export const createSection = createSectionFactory<Section>({
  hero: { heading: "Heading", subheading: "", primaryLabel: "", primaryHref: "#contact", secondaryLabel: "", secondaryHref: "", backgroundImageId: null },
  // ...one template per type
});
```

`createSectionFactory` gives each new section an id and its own copy of the template.
`cloneSection` copies a section with a new id.

`SectionRenderer` renders one section through the renderer for its type. It holds no state, so it
works in a server component, and it needs the same peers as `markdown`. A hidden section, or a type
with no renderer, renders nothing. `feed` and `stats` have no default, since only the app knows its
items and its live numbers. `renderers` replaces the defaults per type, and `context` holds the
app's pieces:

| `context` key | Default | Description |
| --- | --- | --- |
| `href` | the path as it is | Maps a button's path, such as `(path) => localeHref(locale, path)`. |
| `Link` | `SmartLink` | The button link. `SmartLink` scrolls to a `#anchor` and uses next/link for the rest. |
| `Image` | `ContentImage` | The image in image sections. It gets `imageId`, `alt`, `sizes`, `className`, and `width` and `height` where the layout keeps the ratio. |
| `imageDimensions` | `{}` | Intrinsic sizes by image id. |

The configurable defaults come from factories: `createTextRenderer({ bodyClassName })`,
`createContactRenderer({ form, className })` and `createImageRenderer({ intrinsicSize })`.
`heroRenderer`, `featureRenderer` and `ctaRenderer` take no options. For a different hero, register
your own.

```tsx
// src/components/SectionRenderer.tsx
const renderers: SectionRenderers<Section> = {
  contact: createContactRenderer({ form: <ContactForm /> }),
  feed: section => <FeaturedRuns heading={section.heading} limit={section.limit} />,
  stats: section => <StatsBand section={section} />,
};

export default function SectionRenderer({ section }: { section: Section }) {
  return <BaseSectionRenderer section={section} renderers={renderers} context={{ Image }} />;
}
```

`SectionsEditor` is the controlled admin editor: a card per section with hide, move, duplicate and
remove, the type's fields, and an add list. It takes `createSection`, `images` with the app's
`upload` and an optional preview `src`, `strings` and `typeLabels` in English by default, and
`editors` to replace or add an editor per type. Each editor gets `section`, `patch`, `strings` and
`images`. Build an app editor from the exported ones: `HeroSectionEditor` takes `media` between the
subheading and the buttons, `FeedSectionEditor` takes `children` and the grid `className`, and
`StatsSectionEditor` takes the live `sources`. `ImagePicker` and `SectionField` work on their own.
`initialAddType` picks the add list's first choice. `unwrapped` leaves out the wrapping element.

```tsx
const Stats = (props: SectionEditorProps<SectionOf<Section, "stats">>) => (
  <StatsSectionEditor {...props} sources={[{ value: "builds", label: "Published builds (live)", defaultItemLabel: "Builds" }]} />
);

<SectionsEditor
  sections={sections}
  onChange={setSections}
  createSection={createSection}
  images={{ upload: ImageService.upload }}
  editors={{ stats: Stats }}
  strings={dict.sectionsEditor}
  typeLabels={dict.sectionTypes}
/>
```

### `@sjolystinnovation/app-kit/session`

Decides when a user has to sign in again. It is safe to import from server code, such as the
next-auth callbacks.

The gate reads `session.error`. `SessionExpiryGuard` also reads `session.absoluteExpiresAt` for its
countdown, `session.user.id` to keep the page with the user who opened it, and `session.user.email`
to fill in the prompt. `createAuthOptions` sets all of these. Load their types from
`@sjolystinnovation/app-kit/next-auth`, as [`createAuthOptions`](#createauthoptionsconfig-settings)
shows.

`SIGN_IN_ERRORS` holds the two codes a failed sign-in reports: `InvalidCredentials` and
`SignInUnavailable`. Map them to the app's own messages.

`SESSION_ERRORS` holds the values the jwt callback puts in `token.error` when the session cannot be
recovered: `AbsoluteSessionExpired`, `RefreshTokenRejected` and `NoRefreshToken`. `SessionError`
is their union type. `isTerminalSessionError(error)` is true for those three only, so a transient
refresh failure keeps the session.

The re-sign-in prompt is a flag outside React, so an axios interceptor can raise it:

| Function | Description |
| --- | --- |
| `openSessionPrompt()` | Asks the user to sign in again without leaving the page. |
| `closeSessionPrompt()` | Hides the prompt. Call it when the component showing the prompt unmounts, or the flag stays open and the gate never redirects. |
| `getSessionPromptOpen()` | Whether the prompt is showing. |

Copies of the package installed side by side share the one flag, as long as their releases use the
same prompt state format. A release that changes the format says so in its changelog. An app's own
copy of these functions does not share the flag, so import them from this package in the
interceptor, the prompt, and every gate.

### `AppSessionProvider`

From `@sjolystinnovation/app-kit/session/react`. next-auth's `SessionProvider`, reading the session
again every four minutes. Each read lets the jwt callback renew the access token before it expires,
so an open tab does not find a dead session on the next save. It also keeps what `useSession`
reports in this tab up to date. next-auth polls only once a session exists.

```tsx
<AppSessionProvider>{children}</AppSessionProvider>
```

| Prop | Type | Description |
| --- | --- | --- |
| `refetchInterval` | `number` | Seconds between reads. Defaults to 240. Keep it under five minutes, the time before expiry when a refresh falls due. |

### `ProtectedGate`

From `@sjolystinnovation/app-kit/session/react`. Wraps the protected part of the app. It reads
`useSession`, so it needs a `SessionProvider` above it. It sends a signed-out visitor or a session
dead on arrival to `loginHref`, and never redirects while the re-sign-in prompt is open.

A page that rendered on a healthy session stays rendered, so an open form keeps its values:

- when the session gets a terminal error
- while the session is re-read
- while the prompt recovers it

A session that turns signed out with no prompt open blanks the page. A page the user opens on a
dead session does not render. `RoleGate` and `AdminShell` make the same decision, so none of them
blanks a page that another one kept.

```tsx
<ProtectedGate loginHref="/login" fallback={<p>Loading…</p>}>
  {children}
</ProtectedGate>
```

| Prop | Type | Description |
| --- | --- | --- |
| `loginHref` | `string` | Where the redirect goes. An app with a locale in the path builds it for the current locale. |
| `fallback` | `ReactNode` | What shows while the page may not render yet. Defaults to nothing. |

### `RoleGate`

From `@sjolystinnovation/app-kit/session/react`. Renders its children only for a user with `role`.
Place it inside `ProtectedGate`. While the re-sign-in prompt recovers a signed-out session, there is
no user and so no roles. The page stays up only on the path where the session last had the role.

```tsx
<RoleGate role="Admin" fallback={<p>Loading…</p>} denied={<p>You do not have access.</p>}>
  {children}
</RoleGate>
```

| Prop | Type | Description |
| --- | --- | --- |
| `role` | `string` | The role the page needs, as it appears in `session.user.roles`. |
| `fallback` | `ReactNode` | What shows while the session or its roles are not known yet. Defaults to nothing. |
| `denied` | `ReactNode` | What a signed-in user without the role sees. Give this or `deniedHref`. |
| `deniedHref` | `string` | Where a signed-in user without the role is sent instead. |

### `SessionExpiryGuard`

From `@sjolystinnovation/app-kit/session/react`. Render it once, inside the `SessionProvider`. It
shows:

- a banner in the last 30 minutes before `session.absoluteExpiresAt`, with the minutes left. That is
  seven days after sign-in with `createAuthOptions`.
- a banner when the session is dead
- the re-sign-in prompt, a dialog with `CredentialsForm`, when a request or the banner opens it

A sign-in in the prompt keeps the page and its form. If someone signs in to the prompt as a
different user, the guard signs them out and sends them to `loginHref`, so the prompt never hands
the page to another user.

```tsx
<SessionExpiryGuard
  loginHref="/login"
  onRestored={() => toast.success("You are signed in again.")}
/>
```

| Prop | Type | Description |
| --- | --- | --- |
| `loginHref` | `string` | Where the guard sends a different user after it signs them out. |
| `onRestored` | `() => void` | Runs after the prompt signs the user back in, such as to show a toast. |
| `strings` | `TextOverrides<SessionExpiryGuardStrings>` | The guard's text. `{minutes}` in `expiringSoon` becomes the minutes left. The defaults are English. |
| `formStrings` | `TextOverrides<CredentialsFormStrings>` | The text of the form in the prompt. |

### `useFormDraft(config, options)`

From `@sjolystinnovation/app-kit/forms`. Keeps a form's values in `localStorage`, so a sign-out,
reload or closed tab does not lose them. The hook writes values half a second after the last
change, so only that last half second is at risk.

```tsx
// userId is the signed-in user's id, from wherever the app's session keeps it.
const draft = useFormDraft(sessionConfig, {
  owner: userId,
  scope: recipe ? `recipe:${recipe.id}` : "recipe:new",
  value: form,
});
```

| Option | Type | Description |
| --- | --- | --- |
| `owner` | `string \| undefined` | The signed-in user's id. The hook stores drafts per user, and stores nothing until the id is known. When the session stops reporting an owner, the hook keeps the last known one. |
| `scope` | `string` | The form and the entity it edits, such as `recipe:42`. |
| `value` | `T` | The form's current values. They must survive `JSON.stringify`. |

Mount an edit form once the entity has loaded, with its values already in `value`. The hook treats
the values it first sees under a key as the untouched form, so values that arrive later count as an
edit and overwrite the draft on offer.

It returns:

- `pending`, the stored draft. The page offers it to the user and does not apply it. The hook reads
  it when the owner is first known, and again whenever the owner or `scope` changes, so it can
  appear after the form mounts.
- `dismiss()`, to stop offering it.
- `clear()`, to drop the stored draft after a successful save.

The hook stores drafts under `<draftStoragePrefix>:draft:<owner>:<scope>`. It throws when
`draftStoragePrefix` is empty or contains a colon. It does not offer a draft older than 7 days, and
removes that draft when its form next reads it.

### `CredentialsForm`

From `@sjolystinnovation/app-kit/session/react`. Email and password sign-in through next-auth's credentials
provider, with `redirect: false`, so the page stays where it is. Use it on the login page and in
the prompt.

```tsx
<CredentialsForm onSignedIn={() => router.push("/")} strings={{ signIn: "Logg inn" }} />
```

| Prop | Type | Description |
| --- | --- | --- |
| `onSignedIn` | `() => void \| Promise<void>` | Runs after next-auth accepts the credentials. If it throws, the form shows its generic error. |
| `initialEmail` | `string` | The email the field starts with. |
| `children` | `ReactNode` | Extra buttons next to the submit button. |
| `strings` | `TextOverrides<CredentialsFormStrings>` | The form's text. The defaults are English. |
| `onPendingChange` | `(pending: boolean) => void` | Runs when a sign-in starts and ends, such as to keep a dialog open until it finishes. |

A failed sign-in shows `signInUnavailable` for `SIGN_IN_ERRORS.unavailable` and
`invalidCredentials` for any other error code. A request next-auth refuses without an error code,
or one that throws, shows `somethingWentWrong`.

### `LoginPage`

From `@sjolystinnovation/app-kit/session/react`. The sign-in page: a title, `CredentialsForm`, a link to reset
the password, and a sign-up link when the app has sign-up. A sign-in goes to `redirectTo` and
refreshes the page's server data. It uses the same `auth` theme variables as `ResetPasswordFlow`.

```tsx
<LoginPage redirectTo="/admin" resetHref="/reset-password" strings={{ title: "Logg inn" }} formStrings={{ signIn: "Logg inn" }} />
```

| Prop | Type | Description |
| --- | --- | --- |
| `redirectTo` | `string` | Where a signed-in user goes. |
| `resetHref` | `string` | The password reset page. |
| `registerHref` | `string` | The sign-up page. Without it there is no register link. |
| `strings` | `TextOverrides<LoginPageStrings>` | The page's text: `title`, `forgotPassword`, `registerPrompt`, and `register`. Set `registerPrompt` to `null` to leave it out. |
| `formStrings` | `TextOverrides<CredentialsFormStrings>` | The form's text. |
| `className` | `string` | Replaces the outer `max-w-md mx-auto px-4 py-16`. |

### `ResetPasswordFlow`

From `@sjolystinnovation/app-kit/ui`. The password reset page in two steps: the email asks for a
code, then the code and a new password set it. Before it sends the password, the flow checks it
against the same rules as `passwordSchema`, without loading zod. An emailed link with the email and
code, such as an invite, opens it on the second step. Its colors and title size come from the
`auth` and `button` theme variables. See [Theming](#theming).

```tsx
const params = useSearchParams();

<ResetPasswordFlow
  requestReset={UserService.requestPasswordReset}
  reset={UserService.resetPassword}
  loginHref="/login"
  initialEmail={params.get("email") ?? ""}
  initialCode={params.get("code") ?? ""}
  strings={{ title: "Tilbakestill passord", signInPrompt: null }}
/>
```

| Prop | Type | Description |
| --- | --- | --- |
| `requestReset` | `(data: { email }) => Promise<unknown>` | Asks the API to email a code. |
| `reset` | `(data: { email, code, newPassword }) => Promise<unknown>` | Sets the password. When it succeeds, the flow shows the `message` in its answer. |
| `loginHref` | `string` | Where the sign-in links go. |
| `initialEmail`, `initialCode` | `string` | From the emailed link. A code opens the second step. |
| `className` | `string` | Replaces the outer `max-w-md mx-auto px-4 py-16`, such as to sit in the app's own card. |
| `strings` | `TextOverrides<ResetPasswordFlowStrings>` | The page's text. Set `signInPrompt`, `intro`, `codeSent`, or `passwordHint` to `null` to leave it out. `done` set to `null` shows the API's message, or only the sign-in link when it sends none. `passwordInvalid` set to `null` lists every broken rule. |
| `passwordStrings` | `TextOverrides<PasswordStrings>` | The rule messages, in the app's language. |

A failure shows the error's message, or `somethingWentWrong` when it has none.

`TextOverrides<T>`, from `@sjolystinnovation/app-kit/ui`, is the type of every `strings` prop. Each
key is optional and may be `undefined`, and a missing or undefined key shows the English default.

### `TextInput`

From `@sjolystinnovation/app-kit/ui`. A labeled text field with the same look and props as
`PasswordInput`, apart from the show and hide toggle. It takes the other `<input>` attributes too.

```tsx
<TextInput label="Email" name="email" type="email" required error={errors.email} />
```

### `TextArea`

From `@sjolystinnovation/app-kit/ui`. A labeled multi-line field with the same look, label, and
error handling as `TextInput`. It takes the other `<textarea>` attributes too, and works controlled
or uncontrolled.

```tsx
<TextArea label="Description" name="description" rows={4} maxRows={10} error={errors.description} />
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `string` | | Visible label, tied to the text area. |
| `error` | `string` | | Message shown under the field, read out with it by screen readers. |
| `autoGrow` | `boolean` | `true` | Grows with its text from `rows` lines up to `maxRows`, and has no resize handle. With `false` it keeps its size and shows the handle. |
| `rows` | `number` | `3` | Lines shown when empty. |
| `maxRows` | `number` | `12` | The most lines an auto-growing box shows before it scrolls. |
| `className` | `string` | | Classes for placing the field, on the outer element. |

### `Toggle`

From `@sjolystinnovation/app-kit/ui`. An on and off switch for a setting that takes effect at once.
It takes the other `<button>` attributes too.

```tsx
<Toggle label="Email notifications" checked={enabled} onChange={setEnabled} />
<Toggle aria-label="VAT" checked={vat} onChange={setVat} disabled={saving} />
```

| Prop | Type | Description |
| --- | --- | --- |
| `checked` | `boolean` | Whether the switch is on. |
| `onChange` | `(checked: boolean) => void` | Called with the new state. A callback that ignores it also fits. |
| `label` | `string` | Visible text after the switch. It names the switch, and a click on it flips the switch. |
| `aria-label` | `string` | The switch's name when there is no `label`. One of the two is required. |
| `disabled` | `boolean` | Grays the switch out and ignores clicks. |
| `className` | `string` | Classes for placing it, on the outer element. |

An `onClick` that calls `event.preventDefault()` stops the change.

### `Alert`

```tsx
import { Alert } from "@sjolystinnovation/app-kit/ui";

<Alert variant="error">{message}</Alert>;
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant` | `"error" \| "success" \| "info" \| "warning"` | `"info"` | Color of the box. |
| `role` | `"alert" \| "status" \| "none"` | `"alert"` | A screen reader announces `status` without interrupting, on every change of its text. Use `none` when a separate live region announces the text. |
| `className` | `string` | | Classes for placing the alert, such as a margin. Restyle it through the theme variables. A clashing class wins or loses by the order Tailwind emits them in. |
| `children` | `ReactNode` | | Content. |

### `ContentImage`

From `@sjolystinnovation/app-kit/ui`. An uploaded image from the content API, as a plain `<img>`
with a `srcset` of the widths the API serves. It goes through the content images rewrite from
`defineAppConfig({ contentImages: true })`, so the browser never contacts the API host. It works in
a server component.

```tsx
<ContentImage imageId={post.imageId} alt={post.title} sizes="(min-width: 768px) 50vw, 100vw" />
<ContentImage imageId={hero.imageId} fallbackSrc="/hero.jpg" alt="" sizes="100vw" priority aria-hidden />
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `imageId` | `string \| null` | | Uploaded image id. `null` or empty shows `fallbackSrc` as it is, with no `srcset`. |
| `alt` | `string` | | Empty for a decorative image. |
| `sizes` | `string` | | Widths the image is shown at. Required, since a browser assumes `100vw` without it. |
| `fallbackSrc` | `string` | | A static path for when there is no uploaded image. With neither, nothing renders. |
| `priority` | `boolean` | `false` | For the one image visible without scrolling. It loads eagerly, at high priority. |
| `width`, `height` | `number` | | Intrinsic size, to reserve space where the layout fixes no ratio. |
| `base` | `string` | `"/content-images"` | Path the content images rewrite serves. |
| `widths` | `number[]` | `[384, 640, 768, 1024, 1366, 1600]` | Widths in the `srcset`. The default matches the API's default variant widths. |
| `className` | `string` | | Classes on the `<img>`. |

`contentImagePath(id, base?)` and `contentImageSrcSet(id, widths?, base?)` build the same URLs for
other uses, such as a CSS background or an Open Graph image.

### `ErrorState`

From `@sjolystinnovation/app-kit/ui`. What an `error.tsx` shows. It is a client component, as an
error boundary has to be.

```tsx
"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState reset={reset} homeHref="/" />;
}
```

| Prop | Type | Description |
| --- | --- | --- |
| `reset` | `() => void` | The `reset` Next passes to `error.tsx`. The try again button calls it. |
| `homeHref` | `string` | Where the front page link goes, such as `/` or `/en`. |
| `strings` | `TextOverrides<ErrorStateStrings>` | `title`, `body`, `tryAgain`, and `home`. |
| `className` | `string` | Classes for placing it, on the outer element. |

It never shows the error itself.

### `NotFoundState`

From `@sjolystinnovation/app-kit/ui`. What a `not-found.tsx` shows: a large code, the message as
the page's heading, and a link home. It works in a server component.

```tsx
<NotFoundState homeHref="/no" strings={{ body: dict.notFound, home: dict.toFrontPage }} />
```

| Prop | Type | Description |
| --- | --- | --- |
| `homeHref` | `string` | Where the home link goes. |
| `strings` | `TextOverrides<NotFoundStateStrings>` | `code`, `body`, and `home`. |
| `className` | `string` | Classes for placing it, on the outer element. |

### `PasswordInput`

A labeled password field with a button that shows and hides the value. It also takes the other
`<input>` attributes, apart from `type`, which the component switches itself. `className` goes on
the outer element, as the table below describes.

```tsx
import { PasswordInput } from "@sjolystinnovation/app-kit/ui";

<PasswordInput label="Password" name="password" required error={errors.password} />;
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `string` | | Visible label, tied to the input. |
| `error` | `string` | | Message shown under the field. It turns the border red, marks the input invalid and is read out with it by screen readers. |
| `showPasswordLabel` | `string` | `"Show password"` | Accessible name of the toggle while the value is hidden. |
| `hidePasswordLabel` | `string` | `"Hide password"` | Accessible name of the toggle while the value is visible. |
| `className` | `string` | | Classes for placing the field, such as a margin. They go on the outer element around the label, input and error. Restyle the field through the theme variables. |

Pass the two toggle labels in the app's language. The defaults are English.

### `toast`

From `@sjolystinnovation/app-kit/toast`. sonner's `toast`, except that `toast.error` shows nothing
while the re-sign-in prompt is open. The prompt already says why the request failed. Every other
toast passes through, and so do the error states of `toast.promise`.

```ts
import { toast } from "@sjolystinnovation/app-kit/toast";
```

### `passwordSchema(strings?)`

From `@sjolystinnovation/app-kit/validation`. A zod schema for a new password, with the rules the APIs
enforce through ASP.NET Identity: at least 8 characters, with a lowercase letter, an uppercase
letter, and a digit. No symbol is needed. Identity counts only ASCII, so the letters are A to Z and
the digits 0 to 9. "Å" does not count as uppercase. Identity sets no upper limit. If the app's API
sets one, add it with `.max()`. A failing password gets one issue per rule it breaks, each with its
message from `strings`. Missing messages fall back to `defaultPasswordStrings`, which are English.

```ts
import { passwordSchema } from "@sjolystinnovation/app-kit/validation";

const result = passwordSchema({ uppercase: "Ta med en stor bokstav fra A til Z." }).safeParse(newPassword);
const gargeRule = passwordSchema().max(128, "Be at most 128 characters long.");
```

`PASSWORD_MIN_LENGTH` holds the minimum, for hint text. `passwordProblems(password, strings?)` gives the
message of every rule a password breaks, in the same order, without zod.

### `zodFieldErrors(error, options?)`

From `@sjolystinnovation/app-kit/validation`. A failed parse's issues by the top-level field they
belong to, for showing beside each input. Each field gets its first issue's message, or every message
in order with `all: true`. `message` replaces zod's text, such as with the app's own translations.
It leaves out issues that belong to no field.

```ts
import { zodFieldErrors } from "@sjolystinnovation/app-kit/validation";

const parsed = contactSchema.safeParse(form);
if (!parsed.success) setErrors(zodFieldErrors(parsed.error, { message: (issue) => issueMessage(issue, dict) }));
```

### `@sjolystinnovation/app-kit/testing`

Test doubles for the modules every app's tests mock: `next-auth/react`, `next/navigation`, `sonner`
or `@sjolystinnovation/app-kit/toast`. vitest hoists `vi.mock` above
the file's imports, so the factory imports the helpers itself. The test imports the same module to
set the state and read the spies. The state lasts for the whole file, so call `resetTestMocks`
before each test. It needs vitest 5, as an optional peer dependency.

```tsx
import { makeSession, navigation, resetTestMocks, setSession } from "@sjolystinnovation/app-kit/testing";

vi.mock("next-auth/react", async () => (await import("@sjolystinnovation/app-kit/testing")).nextAuthMock());
vi.mock("next/navigation", async () => (await import("@sjolystinnovation/app-kit/testing")).nextNavigationMock());

beforeEach(resetTestMocks);

it("sends a user without the role away", () => {
  navigation.pathname = "/no/admin";
  setSession(makeSession({ roles: [] }));
  render(<AdminLayout><p>admin work</p></AdminLayout>);
  expect(navigation.router.replace).toHaveBeenCalledWith("/no");
});
```

- `setSession(session | null | "loading")` and `makeSession({ roles, ...overrides })` set what
  `useSession` returns. `auth.signIn`, `auth.signOut` and `auth.getSession` are the spies behind
  next-auth's calls.
- `navigation.pathname`, `navigation.searchParams` and `navigation.router` feed `usePathname`,
  `useSearchParams` and `useRouter`.
- `toastMock()` records every toast in `toastSpies`.

## Theming

The components draw every color, corner radius, and label size from theme variables with a light
default. Set any of them in the app's own `@theme` to restyle every component at once, or in a
selector such as `.dark` for a scoped theme:

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "@sjolystinnovation/app-kit/styles.css";

@theme {
  --color-alert-error-bg: color-mix(in oklab, var(--color-red-500) 10%, transparent);
  --color-alert-error-text: var(--color-red-400);
  --radius-alert: var(--radius-xl);
  --color-input-focus-ring: var(--color-sky-500);
}
```

| Variable | Default |
| --- | --- |
| `--radius-alert` | `var(--radius-lg)` |
| `--color-alert-error-bg`, `-border`, `-text` | red 50, 200, 700 |
| `--color-alert-success-bg`, `-border`, `-text` | green 50, 200, 700 |
| `--color-alert-info-bg`, `-border`, `-text` | gray 50, 200, 700 |
| `--color-alert-warning-bg`, `-border`, `-text` | amber 50, 200, 900 |
| `--text-field-label`, `--text-field-label--line-height` | `var(--text-sm)` and its line height. Set both together. |
| `--color-field-label-text` | gray 700 |
| `--spacing-field-label` | gap under the label, `calc(var(--spacing) * 1)` |
| `--color-field-required` | red 600, the asterisk on a required field |
| `--color-field-error` | red 600, the message under a field |
| `--radius-input` | `var(--radius-lg)` |
| `--spacing-input-y` | `calc(var(--spacing) * 2)` |
| `--color-input-bg` | `transparent` |
| `--color-input-border` | gray 300 |
| `--color-input-border-error` | red 400 |
| `--color-input-focus-border` | gray 300 |
| `--color-input-text` | gray 900 |
| `--color-input-placeholder` | gray 400 |
| `--color-input-focus-ring` | `var(--color-primary)` |
| `--input-focus-ring-width` | `2px` |
| `--color-input-toggle` | gray 400, the show password icon |
| `--color-input-toggle-hover` | gray 600 |
| `--color-toggle-on` | `var(--color-primary)`, the track of a `Toggle` that is on |
| `--color-toggle-off` | gray 200, the track of a `Toggle` that is off |
| `--color-toggle-thumb` | white |
| `--text-auth-title`, `--text-auth-title--line-height` | `var(--text-2xl)` and its line height, the title of `LoginPage` and `ResetPasswordFlow` |
| `--font-weight-auth-title` | black |
| `--color-auth-heading` | gray 900 |
| `--color-auth-text` | gray 600, the line under the title and the intro |
| `--color-auth-note` | gray 600, the note that a code was sent |
| `--color-auth-hint` | gray 500, the hint under the password |
| `--color-auth-link`, `-hover` | gray 900, the sign-in links |
| `--font-weight-auth-link` | semibold |
| `--color-admin-title` | gray 900, the title of `AdminShell` |
| `--color-admin-border` | gray 200, the line under the tabs |
| `--color-admin-tab`, `-hover` | gray 500 and gray 900 |
| `--color-admin-tab-active` | gray 900 |
| `--color-admin-tab-indicator` | `var(--color-primary)`, the line under the active tab |
| `--color-chart-grid` | gray 200, the scale lines of `StatHistoryChart` |
| `--color-chart-label` | gray 400, the chart's numbers and dates |
| `--radius-button` | `var(--radius-lg)` |
| `--color-button-primary-bg` | `var(--color-primary)` |
| `--color-button-primary-text` | `var(--color-primary-foreground)` |
| `--color-button-secondary-border` | gray 300 |
| `--color-button-secondary-text` | gray 700 |
| `--color-button-secondary-hover-bg` | gray 50 |
| `--radius-dialog` | `var(--radius-xl)` |
| `--color-dialog-backdrop` | black at 40% |
| `--color-dialog-bg` | white |
| `--color-dialog-title` | gray 900 |
| `--color-dialog-text` | gray 600 |
| `--color-state-heading` | gray 900, the heading of an `ErrorState` |
| `--color-state-text` | gray 600, the text of an `ErrorState` or `NotFoundState` |
| `--color-state-code` | gray 900, the code of a `NotFoundState` |
| `--font-state-code` | `inherit`, the font of that code |
| `--color-state-link`, `-hover` | gray 900, the home link |
| `--color-markdown-heading`, `-strong` | gray 900, headings and bold text in `Markdown` |
| `--color-markdown-link` | gray 900 |
| `--color-markdown-link-hover` | gray 600 |
| `--color-markdown-border` | gray 200, rules, quotes and table lines |
| `--color-markdown-code-bg`, `-code-text` | gray 100, gray 900 |
| `--radius-payment-button` | `var(--radius-button)`, the buttons on a `PaymentReturn` |
| `--color-payment-success`, `-pending`, `-failed` | green 600, amber 500, red 600, the icon on a `PaymentReturn` |
| `--color-payment-title`, `-text`, `-note` | gray 900, 600, 500 |
| `--color-payment-secondary-bg`, `-hover-bg`, `-text` | gray 100, 200, 700, its secondary link |

A default that points at another variable is read once for the whole page. The focus ring and the
primary button point at `--color-primary` and `--color-primary-foreground`. A scoped theme that
changes those also sets `--color-input-focus-ring`, `--color-button-primary-bg` and
`--color-button-primary-text` in the same selector.

An app that clears a whole Tailwind namespace, such as `--color-*: initial`, clears these variables
with it and has to set the ones it uses itself.

## Requirements

- Next.js 16 and React 19, as peer dependencies the app installs itself.
- For `auth`, `api`, `server`, `session/react`, and `admin`: next-auth 4.24 or later and axios 1.20
  or later, as optional peer dependencies. A site without sign-in, which uses only entries such as
  the root entry, `ui`, `seo`, `next-config`, `markdown`, `legal`, `toast`, or `validation`, leaves
  them out.
- For `@sjolystinnovation/app-kit/validation`: zod 4, as an optional peer dependency.
- For `@sjolystinnovation/app-kit/testing`: vitest 5, as an optional peer dependency.
- For `@sjolystinnovation/app-kit/toast`, `admin`, and `branding`: sonner 2, as an optional peer
  dependency. Install a single copy, because two copies keep two separate toast stores.
- `jsonwebtoken` comes with the package. `@sjolystinnovation/app-kit/auth` uses it on the server.
- For the components in `ui`, `admin`, `legal`, `markdown`, `branding`, `payments`, and
  `session/react`: Tailwind CSS 4. `ui`, `admin`, `branding`, `payments`, and `session/react` also
  need `@heroicons/react` 2. The focus ring and the primary button use the theme's `primary` and
  `primary-foreground` colors, unless you set their own variables.
- TypeScript with `"moduleResolution": "bundler"`. Relative imports here are extensionless, which
  `node16` and `nodenext` reject.

There is no build output. Bundlers strip or relocate `"use client"` directives, and shipping source
keeps them intact. The consumer compiles this source with its own `compilerOptions`, and
`skipLibCheck` does not exempt it.

## License

[Apache-2.0](./LICENSE) © Sjølyst Innovation AS
