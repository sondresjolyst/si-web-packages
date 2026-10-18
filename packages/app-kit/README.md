# @sjolystinnovation/app-kit

[![npm](https://img.shields.io/npm/v/@sjolystinnovation/app-kit.svg)](https://www.npmjs.com/package/@sjolystinnovation/app-kit)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/sondresjolyst/si-web-packages/blob/main/packages/app-kit/LICENSE)

Building blocks for Next.js apps that sign in against a JWT API through next-auth.

The package is for Next.js App Router apps that share one ASP.NET Core API, such as one built on the
SjolystInnovation.AppKit .NET packages. It holds the code those apps have in common: next-auth
sign-in and token refresh, an axios client, error messages a user can read, session gates and the
re-sign-in prompt, form drafts, admin forms, page sections, SEO helpers, and the Next config with
security headers. Each part is a separate entry point, so an app imports only what it uses.

## Contents

- [Install](#install)
- [Entry points](#entry-points)
- [Root entry point](#root-entry-point)
- [`next-config`](#sjolystinnovationapp-kitnext-config)
- [`auth`](#sjolystinnovationapp-kitauth) and [`next-auth`](#sjolystinnovationapp-kitnext-auth)
- [`session`](#sjolystinnovationapp-kitsession) and [`session/react`](#sjolystinnovationapp-kitsessionreact)
- [`api`](#sjolystinnovationapp-kitapi) and [`server`](#sjolystinnovationapp-kitserver)
- [`company`](#sjolystinnovationapp-kitcompany)
- [`forms`](#sjolystinnovationapp-kitforms), [`toast`](#sjolystinnovationapp-kittoast), and [`validation`](#sjolystinnovationapp-kitvalidation)
- [`ui`](#sjolystinnovationapp-kitui)
- [`admin`](#sjolystinnovationapp-kitadmin)
- [`branding`](#sjolystinnovationapp-kitbranding) and [`branding/server`](#sjolystinnovationapp-kitbrandingserver)
- [`markdown`](#sjolystinnovationapp-kitmarkdown), [`legal`](#sjolystinnovationapp-kitlegal), and [`sections`](#sjolystinnovationapp-kitsections)
- [`seo`](#sjolystinnovationapp-kitseo) and [`seo/og`](#sjolystinnovationapp-kitseoog)
- [`payments`](#sjolystinnovationapp-kitpayments)
- [`locales/nb`](#sjolystinnovationapp-kitlocalesnb)
- [`testing`](#sjolystinnovationapp-kittesting)
- [Theming](#theming)
- [Requirements](#requirements)

## Install

```sh
npm install @sjolystinnovation/app-kit
```

Next.js 16 and React 19 are required peer dependencies. The other peers are optional. Install the
ones the entry points you import need:

| Peer dependency | Needed by |
| --- | --- |
| `@heroicons/react` 2 | `ui`, `admin`, `branding`, `sections`, `payments`, and `session/react` |
| `next-auth` 4.24 or later | `auth`, `api`, `server`, `session/react`, `admin`, and `testing` |
| `axios` 1.20 or later | `auth`, `api`, `admin`, and `branding` |
| `sonner` 2 | `toast`, `admin`, `branding`, and `sections` |
| `zod` 4 | `validation` |
| `react-markdown` 10, `remark-gfm` 4, and `rehype-sanitize` 6 | `markdown`, `legal`, and `sections` |
| `vitest` 5 | `testing` |

Every other entry point, such as the root entry, `next-config`, `seo`, `forms`, `legal`, `company`,
or `locales/nb`, works without `@heroicons/react`. Install a single copy of `sonner`, because two
copies keep two separate toast stores. `jsonwebtoken` comes with the package.

For a site without sign-in, which uses only entries such as the root entry, `ui`, `seo`, `company`,
or `next-config`:

```sh
npm install @sjolystinnovation/app-kit next react react-dom @heroicons/react
```

For an app with sign-in, the admin area, and Markdown:

```sh
npm install @sjolystinnovation/app-kit next react react-dom @heroicons/react next-auth axios sonner zod react-markdown remark-gfm rehype-sanitize
```

The package ships TypeScript source. Add it to `transpilePackages`, or use `defineAppConfig` from
[`next-config`](#sjolystinnovationapp-kitnext-config), which adds it for you:

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@sjolystinnovation/app-kit"],
};

export default nextConfig;
```

The components use Tailwind CSS 4. Import the package's stylesheet after Tailwind:

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "@sjolystinnovation/app-kit/styles.css";
```

## Entry points

| Import | What it holds |
| --- | --- |
| [`@sjolystinnovation/app-kit`](#root-entry-point) | The session config and `requireEnv`. Imports no peer dependency. |
| [`@sjolystinnovation/app-kit/next-config`](#sjolystinnovationapp-kitnext-config) | The shared `next.config.ts` with the security headers. |
| [`@sjolystinnovation/app-kit/auth`](#sjolystinnovationapp-kitauth) | The next-auth options for email and password sign-in against the API. Server only. |
| [`@sjolystinnovation/app-kit/next-auth`](#sjolystinnovationapp-kitnext-auth) | Type declarations for the fields the auth options add to the session and the token. |
| [`@sjolystinnovation/app-kit/session`](#sjolystinnovationapp-kitsession) | Session error codes and the re-sign-in prompt flag. Safe on the server. |
| [`@sjolystinnovation/app-kit/session/react`](#sjolystinnovationapp-kitsessionreact) | The session provider, gates, expiry guard, sign-in form, and login page. |
| [`@sjolystinnovation/app-kit/api`](#sjolystinnovationapp-kitapi) | The axios clients, error messages, field errors, and services for the API's endpoints. |
| [`@sjolystinnovation/app-kit/company`](#sjolystinnovationapp-kitcompany) | `mergeCompanyInfo`, `formatOrgNumber`, and the `CompanyInfo` type. Imports no peer dependency. |
| [`@sjolystinnovation/app-kit/server`](#sjolystinnovationapp-kitserver) | Cached public GETs and the revalidate route. Server only. |
| [`@sjolystinnovation/app-kit/forms`](#sjolystinnovationapp-kitforms) | `useFormDraft`, which keeps form values in `localStorage`. |
| [`@sjolystinnovation/app-kit/toast`](#sjolystinnovationapp-kittoast) | sonner's `toast`, quiet on errors while the re-sign-in prompt is open. |
| [`@sjolystinnovation/app-kit/validation`](#sjolystinnovationapp-kitvalidation) | The password schema and zod field errors. |
| [`@sjolystinnovation/app-kit/ui`](#sjolystinnovationapp-kitui) | Form controls, alerts, content images, error pages, and the password reset flow. |
| [`@sjolystinnovation/app-kit/admin`](#sjolystinnovationapp-kitadmin) | The admin frame, company settings, users, legal pages editor, stats chart, and email stats panel. |
| [`@sjolystinnovation/app-kit/branding`](#sjolystinnovationapp-kitbranding) | The uploaded logo and favicon: provider, hook, and admin form. |
| [`@sjolystinnovation/app-kit/branding/server`](#sjolystinnovationapp-kitbrandingserver) | The `app/icon.ts` response for the uploaded favicon. Server only. |
| [`@sjolystinnovation/app-kit/markdown`](#sjolystinnovationapp-kitmarkdown) | Sanitized Markdown rendering. |
| [`@sjolystinnovation/app-kit/legal`](#sjolystinnovationapp-kitlegal) | The legal page view, the `LegalPage` type, and the default legal page keys. Needs neither axios nor next-auth. |
| [`@sjolystinnovation/app-kit/sections`](#sjolystinnovationapp-kitsections) | Page sections with a renderer registry and an editor registry. |
| [`@sjolystinnovation/app-kit/seo`](#sjolystinnovationapp-kitseo) | Canonical URLs, metadata, sitemaps, `robots.txt`, and structured data. |
| [`@sjolystinnovation/app-kit/seo/og`](#sjolystinnovationapp-kitseoog) | The default Open Graph share image. |
| [`@sjolystinnovation/app-kit/payments`](#sjolystinnovationapp-kitpayments) | The page a user returns to from a payment provider. |
| [`@sjolystinnovation/app-kit/locales/nb`](#sjolystinnovationapp-kitlocalesnb) | Norwegian (bokmål) text for every component that takes `strings`. Imports no peer dependency. |
| [`@sjolystinnovation/app-kit/testing`](#sjolystinnovationapp-kittesting) | vitest doubles for next-auth, next/navigation, and sonner. |
| [`@sjolystinnovation/app-kit/styles.css`](#theming) | The theme variables and styles the components use. |

Most components export their props type as `<Component>Props`. Every `strings` prop has a
`<Component>Strings` type and a `default<Component>Strings` constant with the English text.
`strings` takes `TextOverrides<T>` from `ui`: each key is optional, and a missing or `undefined` key
shows the English default. [`locales/nb`](#sjolystinnovationapp-kitlocalesnb) has the Norwegian
text for every one.

## Root entry point

`@sjolystinnovation/app-kit` holds `defineSessionConfig`, `requireEnv`, and the `SessionConfig`
type. It imports no peer dependency, so it works in browser code, server code, and
`next.config.ts`.

Declare the values that differ between apps once, then pass that config wherever you need it:

```ts
// src/lib/session.ts
import { defineSessionConfig } from "@sjolystinnovation/app-kit";

export const sessionConfig = defineSessionConfig({
  jwtSecretEnvVar: "API_JWT_SECRET",
  loginRoute: "/en/login",
  draftStoragePrefix: "example",
});
```

| Property | Type | Description |
| --- | --- | --- |
| `jwtSecretEnvVar` | `string` | The name of the environment variable that holds the API JWT secret, such as `API_JWT_SECRET`. |
| `loginRoute` | `string` | Where an expired session sends the browser, such as `/en/login` or `/login`. |
| `draftStoragePrefix` | `string` | The bare name for the `localStorage` keys that hold form drafts, such as `example`. Drafts are stored under `example:draft:<owner>:<scope>`. |

`defineSessionConfig(config)` returns the config unchanged, so TypeScript checks its shape where it
is declared. It throws when `draftStoragePrefix` is empty or contains a colon.

`requireEnv(name, value)` returns `value`, or throws `Missing <name>.` when it is unset or empty.
Pass the value read in place, such as `process.env.NEXT_PUBLIC_API_URL`, so Next.js can inline a
public variable at build time.

## `@sjolystinnovation/app-kit/next-config`

The config every app shares, for `next.config.ts`. It imports nothing but Next's types, so Next
loads it with no build step.

`defineAppConfig(options, extra?)` gives the standalone build, app-kit in `transpilePackages`, no
`X-Powered-By`, an `expireTime` of a year, image qualities 75 and 100, the incremental cache
in memory, and the security headers on every page. It merges `extra` over that config. It combines
`transpilePackages`, `images`, `experimental`, `headers`, and `rewrites` instead of replacing them.

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
| `dev` | `boolean` | Whether this is a development build. Development builds also allow `'unsafe-eval'`, which hot reload needs. |
| `websocket` | `boolean` | Whether to allow `ws:` and `wss:` to the API origin, for SignalR. |
| `imgFromApi` | `boolean` | Whether to allow images from the API origin. Not needed with `contentImages`. |
| `contentImages` | `boolean` | Whether to proxy `/content-images/*` to the API's `/content-images/*`, so the browser never contacts the API host. |
| `connectSrc`, `imgSrc` | `string[]` | Extra sources for those directives. |
| `frameSrc`, `objectSrc` | `string[]` | Sources for those directives. Both default to `'none'`. |
| `pathHeaders` | `{ source, headers }[]` | Headers for particular paths, such as a file download. They come after the page headers and replace a page header of the same name. Every path keeps the rest. |
| `permissionsPolicy` | `string` | Replaces `camera=(), microphone=(), geolocation=()`. |
| `expireTime` | `number` | The seconds a cached page may be served after it was last generated. Defaults to a year, Next's default. |
| `isrFlushToDisk` | `boolean` | Whether to write revalidated pages to disk. Defaults to `false`, for a read-only root filesystem. |

Until a page reaches its `expireTime`, Next serves the cached copy at once and regenerates it in the
background when it is stale. If the regeneration fails, for example because the API is down, Next
keeps the last good copy and tries again on a later request. Once the page is past its
`expireTime`, Next regenerates it while the visitor waits, and a page whose `publicGet` throws then
answers 500. The long default keeps legal pages, the sitemap, and other pages with few visitors up
through an API outage. A page that was never generated still answers 500 while the API is down,
rather than being cached empty. Set a shorter `expireTime` only if a page must never be served more
than that old, and accept the 500.

Scripts allow `'unsafe-inline'`, since a nonce would make every statically rendered page dynamic.
The package also exports the `AppConfigOptions` and `CspOptions` types.

## `@sjolystinnovation/app-kit/auth`

Server only. `createAuthOptions(config, settings)` builds the next-auth options for an app that
signs in against the API with email and password.

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
| `apiUrl` | `string` | The base URL of the API. Sign-in posts to `/auth/login`, refresh to `/auth/refresh-token`, and sign-out to `/auth/logout` under it. An empty value throws. |
| `env` | `Record<string, string \| undefined>` | The server environment, usually `process.env`. It supplies the secret that `jwtSecretEnvVar` names. |
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
  - `SIGN_IN_ERRORS.lockedOut` when the API answers with the code `lockedOut`, after too many failed
    sign-ins. The API gives it whether the password was right or wrong.
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
  server actions. A refresh there replaces the tokens at the API and loses the new ones. The next
  refresh then reuses the old token, and the API revokes every session the user has. On the server,
  read the token with `getToken` from `next-auth/jwt`, which never refreshes.
- Run the app as one server process. Parallel session reads share one refresh only within a
  process. Two replicas can refresh the same token at once, with the same result.

The package also exports the `AuthOptionsSettings` and `SessionUser` types.

## `@sjolystinnovation/app-kit/next-auth`

Type declarations only. They add the fields that `createAuthOptions` sets to next-auth's `Session`
and `JWT` types. Load them once, from one of the app's own `.d.ts` files:

```ts
// src/types/next-auth.d.ts
import "@sjolystinnovation/app-kit/next-auth";
```

The session carries `user` (`id`, `name`, `email`, `roles`), `accessToken`, `error`, and
`absoluteExpiresAt`. The token carries `accessToken`, `refreshToken`, `refreshAt`, `loginAt`,
`user`, and `error`.

## `@sjolystinnovation/app-kit/session`

Decides when a user has to sign in again. It is safe to import from server code, such as the
next-auth callbacks.

- `SIGN_IN_ERRORS` holds the three codes a failed sign-in reports: `InvalidCredentials`,
  `SignInUnavailable`, and `LockedOut`. Map them to the app's own messages.
- `SESSION_ERRORS` holds the values the jwt callback puts in `token.error` when the session cannot
  be recovered: `AbsoluteSessionExpired`, `RefreshTokenRejected`, and `NoRefreshToken`.
  `SessionError` is their union type.
- `isTerminalSessionError(error)` is true for those three only, so a transient refresh failure
  keeps the session.

```ts
import { SIGN_IN_ERRORS, isTerminalSessionError } from "@sjolystinnovation/app-kit/session";

const signInMessage = (code: string | undefined) =>
  code === SIGN_IN_ERRORS.unavailable ? "The service is down. Try again soon." : "Wrong email or password.";

const mustSignInAgain = (session: { error?: string | undefined } | null) => isTerminalSessionError(session?.error);
```

The re-sign-in prompt is a flag outside React, so an axios interceptor can raise it:

| Function | Description |
| --- | --- |
| `openSessionPrompt()` | Asks the user to sign in again without leaving the page. |
| `closeSessionPrompt()` | Hides the prompt. Call it when the component that shows the prompt unmounts, or the flag stays open and the gate never redirects. |
| `getSessionPromptOpen()` | Whether the prompt is showing. |

Copies of the package installed side by side share the one flag, as long as their releases use the
same prompt state format. A release that changes the format says so in its changelog. An app's own
copy of these functions does not share the flag, so import them from this package in the
interceptor, the prompt, and every gate.

## `@sjolystinnovation/app-kit/session/react`

The client side of the session. The gates and the guard read `session.error`. `SessionExpiryGuard`
also reads `session.absoluteExpiresAt` for its countdown, `session.user.id` to keep the page with
the user who opened it, and `session.user.email` to fill in the prompt. `createAuthOptions` sets all
of these. Load their types from [`next-auth`](#sjolystinnovationapp-kitnext-auth).

A typical layout for the signed-in part of an app:

```tsx
// src/app/(protected)/layout.tsx
"use client";
import type { ReactNode } from "react";
import { AppSessionProvider, ProtectedGate, SessionExpiryGuard } from "@sjolystinnovation/app-kit/session/react";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AppSessionProvider>
      <SessionExpiryGuard loginHref="/login" />
      <ProtectedGate loginHref="/login" fallback={<p>Loading…</p>}>
        {children}
      </ProtectedGate>
    </AppSessionProvider>
  );
}
```

### `AppSessionProvider`

next-auth's `SessionProvider`, reading the session again every four minutes. Each read lets the jwt
callback renew the access token before it expires, so an open tab does not find a dead session on
the next save. It also keeps what `useSession` reports in this tab up to date. next-auth polls only
once a session exists.

| Prop | Type | Description |
| --- | --- | --- |
| `refetchInterval` | `number` | The seconds between reads. Defaults to 240. Keep it under five minutes, the time before expiry when a refresh falls due. |

### `ProtectedGate`

Wraps the protected part of the app. It reads `useSession`, so it needs a `SessionProvider` above
it. It sends a signed-out visitor, or a session dead on arrival, to `loginHref`. It never redirects
while the re-sign-in prompt is open.

A page that rendered on a healthy session stays rendered, so an open form keeps its values:

- when the session gets a terminal error
- while the session is read again
- while the prompt recovers it

A session that turns signed out with no prompt open blanks the page. A page the user opens on a dead
session does not render. `RoleGate` and `AdminShell` make the same decision, so none of them blanks
a page that another one kept.

| Prop | Type | Description |
| --- | --- | --- |
| `loginHref` | `string` | Where the redirect goes. An app with a locale in the path builds it for the current locale. |
| `fallback` | `ReactNode` | What shows while the page may not render yet. Defaults to nothing. |

### `RoleGate`

Renders its children only for a user with `role`. Place it inside `ProtectedGate`. While the
re-sign-in prompt recovers a signed-out session, there is no user and so no roles. The page stays
up only on the path where the session last had the role.

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
| `deniedHref` | `string` | Where a signed-in user without the role goes instead. |

### `SessionExpiryGuard`

Render it once, inside the `SessionProvider`. It shows:

- a banner in the last 30 minutes before `session.absoluteExpiresAt`, with the minutes left. That is
  seven days after sign-in with `createAuthOptions`.
- a banner when the session is dead
- the re-sign-in prompt, a dialog with `CredentialsForm`, when a request or the banner opens it

A sign-in in the prompt keeps the page and its form. If someone signs in to the prompt as a
different user, the guard signs them out and sends them to `loginHref`, so the prompt never hands
the page to another user.

```tsx
<SessionExpiryGuard loginHref="/login" onRestored={() => toast.success("You are signed in again.")} />
```

| Prop | Type | Description |
| --- | --- | --- |
| `loginHref` | `string` | Where the guard sends a different user after it signs them out. |
| `onRestored` | `() => void` | Runs after the prompt signs the user back in, such as to show a toast. |
| `strings` | `TextOverrides<SessionExpiryGuardStrings>` | The guard's text. `{minutes}` in `expiringSoon` becomes the minutes left. |
| `formStrings` | `TextOverrides<CredentialsFormStrings>` | The text of the form in the prompt. |

### `CredentialsForm`

Email and password sign-in through next-auth's credentials provider, with `redirect: false`, so the
page stays where it is. Use it on the login page and in the prompt.

```tsx
<CredentialsForm onSignedIn={() => router.push("/")} strings={{ signIn: "Logg inn" }} />
```

| Prop | Type | Description |
| --- | --- | --- |
| `onSignedIn` | `() => void \| Promise<void>` | Runs after next-auth accepts the credentials. If it throws, the form shows `somethingWentWrong`. |
| `initialEmail` | `string` | The email the field starts with. |
| `children` | `ReactNode` | Extra buttons next to the submit button. |
| `strings` | `TextOverrides<CredentialsFormStrings>` | The form's text. |
| `onPendingChange` | `(pending: boolean) => void` | Runs when a sign-in starts and ends, such as to keep a dialog open until it finishes. |

A failed sign-in shows `signInUnavailable` for `SIGN_IN_ERRORS.unavailable`, `lockedOut` for
`SIGN_IN_ERRORS.lockedOut`, and `invalidCredentials` for any other error code. A request that next-auth refuses without an error
code, or one that throws, shows `somethingWentWrong`.

### `LoginPage`

The sign-in page: a title, `CredentialsForm`, a link to reset the password, and a sign-up link when
the app has sign-up. A sign-in goes to `redirectTo` and refreshes the page's server data. It uses the
same `auth` theme variables as `ResetPasswordFlow`.

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

## `@sjolystinnovation/app-kit/api`

The browser side of the API: the axios clients, error messages, field errors, and services for the
endpoints that the SjolystInnovation.AppKit .NET packages map.

### `createApiClient` and `createPublicClient`

`createApiClient(baseURL)` returns an axios instance for the signed-in API, for code that runs in the
browser. It reads the session through next-auth's `getSession`, which has no cookies to read on the
server. An empty `baseURL` throws. Each request carries the session's access token. When the session
is gone or has a terminal error, a 401 opens the re-sign-in prompt. It does not sign the user out, so
the page keeps its state. The error still rejects as usual.

`createPublicClient(baseURL)` is the same without the session, for the API's anonymous endpoints. An
empty `baseURL` throws, and requests only go to `baseURL`.

### `request`

`request(call, fallback, statusMessages?)` runs a call and returns its `data`. A failure becomes an
`Error` with the message that `formatApiError` gives it. When the API answers with a validation
problem, the error also keeps its per-field messages and their codes for `apiFieldErrors` and for
the field errors of the shared forms. When the API answers with a code for the whole call, such as
`{ "message": "...", "code": "invalidResetCode" }`, the error keeps the code for `apiErrorCode`. It
keeps nothing else from the response. A canceled call rethrows the cancel unchanged.

```ts
import { requireEnv } from "@sjolystinnovation/app-kit";
import { createApiClient, request } from "@sjolystinnovation/app-kit/api";

const api = createApiClient(requireEnv("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL));

export const getRecipe = (id: number) => request(() => api.get<Recipe>(`/recipes/${id}`), "Could not load the recipe.");
```

### `formatApiError`

`formatApiError(error, fallback, statusMessages?)` turns a failed request into one line a user can
read.

On a 4xx response, it uses the first of these:

1. The body's own message: a text body, such as the one `BadRequest("...")` sends from ASP.NET Core,
   or `message`, the first validation error, or `detail` from a JSON body.
2. The entry in `statusMessages` for the status.
3. `fallback`.

On a 5xx response, the entry in `statusMessages` comes first, then the body, then `fallback`. A 5xx
body can come from a proxy, such as "Bad Gateway", so the caller's own words win when it has them.

The function never shows a problem details `title`. ASP.NET Core fills it with generic text, such as
"Bad Request" or "An error occurred while processing your request.", which says less than
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

### `apiFieldErrors`

`apiFieldErrors(error)` reads the per-field messages of an ASP.NET validation problem from a failed
call, its body, or the `Error` that `request` and the services throw. It keys them in camelCase to
match the form: `{ errors: { OrgNumber: ["..."] } }` becomes `{ orgNumber: ["..."] }`. It returns
`null` when there are none, so the form falls back to one message.

```ts
try {
  await SettingsService.update(settings);
} catch (err) {
  setFieldErrors(apiFieldErrors(err) ?? {});
  toast.error(err instanceof Error ? err.message : "Could not save.");
}
```

### `apiErrorCode`

`apiErrorCode(error)` reads the code of a failure that is not about one field, from a failed call,
its body, or the `Error` that `request` and the services throw. It answers `undefined` when there is
none, and never takes axios's own code, such as `ERR_NETWORK`. Use it to show the app's own text for
a code and the API's message for any other failure. The components in this package do that through
their `strings`.

```ts
try {
  await UserService.deleteAccount();
} catch (err) {
  const own = { lastAdmin: "Gi administratorrollen til noen andre først." };
  const code = apiErrorCode(err);
  toast.error(code && Object.hasOwn(own, code) ? own[code as keyof typeof own] : formatApiError(err, "Kunne ikke slette kontoen."));
}
```

### Services

The services call the endpoints that the SjolystInnovation.AppKit .NET packages map, so you do not
write them in the app. `api` is a `createApiClient` instance, and `publicApi` is a
`createPublicClient` one. A failure throws an `Error` with the API's message, or with the service's
own English fallback. The error keeps the field errors for `apiFieldErrors` and the code for
`apiErrorCode`. `onSaved` runs after a save succeeds, such as
`() => revalidateTarget("branding")`, with the `revalidate` that
[`defineRevalidateTargets`](#definerevalidatetargets) returns.

| Factory | Methods | .NET package |
| --- | --- | --- |
| `createUserService(api, publicApi)` | `requestPasswordReset`, `resetPassword`, and for the signed-in user `getProfile`, `updateProfile`, `changePassword`, `exportData`, and `deleteAccount` | Auth |
| `createAdminUsersService(api)` | `getUsers(includeDeleted?)`, `roles`, `addRole`, `removeRole`, `deleteUser`, and `invite({ email, firstName, lastName, role })` | Auth |
| `createSettingsService(api, { onSaved? })` | `get` and `update` | SiteSettings |
| `createBrandingService(api, publicApi, { onSaved? })` | `get`, which answers `{}` when the API cannot be read, and `update(form)` | SiteSettings |
| `createLegalService(api, publicApi, { keys?, onSaved? })` | `keys`, `get(key, locale)`, which answers `null` for a missing page, `listAll`, and `save({ key, locale, title, bodyMarkdown })` | SiteSettings |
| `createEmailStatsService(api)` | `get(days?)`, the email stats for the last `days` days, 30 by default | Email |

`roles` gives the roles an admin may give, from `GET /users/roles`, in the order the API configures
them.

The legal pages follow the API's model. `MapAppKitLegalPages` has a `Keys` option that defaults to
`terms`, `privacy`, and `cookies`. `createLegalService` takes the same keys as `keys`, with the same
default, `LEGAL_PAGE_KEYS`. The key type of `get`, `save`, and `LegalPage` comes from them, and the
service's `keys` feeds [`LegalPagesEditor`](#legalpageseditor-and-localetabs) and `legalEntries`:

```ts
// The API maps the same keys: app.MapAppKitLegalPages<AppDbContext>(o => o.Keys = ["terms", "privacy", "refunds"]);
export default createLegalService(api, publicApi, { keys: ["terms", "privacy", "refunds"], onSaved });
```

```ts
// src/services/userService.ts
import { requireEnv } from "@sjolystinnovation/app-kit";
import { createApiClient, createPublicClient, createUserService } from "@sjolystinnovation/app-kit/api";

const apiUrl = requireEnv("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL);

export default createUserService(createApiClient(apiUrl), createPublicClient(apiUrl));
```

The package also exports the response types `UserProfile`, `AdminUser`, `SiteSettings`,
`LegalPage`, and `EmailStats`, the `OnSaved` callback type, and the `LegalServiceOptions` type.

### `mergeCompanyInfo` and `formatOrgNumber`

`./api` also exports the [`company`](#sjolystinnovationapp-kitcompany) helpers and types, so
existing imports keep working.

### `defineRevalidateTargets`

`defineRevalidateTargets({ locales, targets })` keeps the revalidate targets in one file that the
admin services and the revalidate route both import. `pages` are below each locale segment, and
`root` paths are not. It returns `targets` for fetch tags, `paths` for
[`createRevalidateRoute`](#createrevalidateroute), and `revalidate(target)` for the services'
`onSaved`. `revalidate` posts the target to `/api/revalidate` and never throws. On failure, the
pages' own revalidate window is the fallback.

```ts
// src/lib/cacheTags.ts
import { defineRevalidateTargets } from "@sjolystinnovation/app-kit/api";

export const { targets: REVALIDATE_TARGETS, paths: TARGET_PATHS, revalidate: revalidateTarget } = defineRevalidateTargets({
  locales: ["no", "en"],
  targets: {
    legal: { pages: ["/terms", "/privacy", "/cookies"], root: ["/sitemap.xml"] },
    // Every page renders branding through the layout, so its tag reaches them all.
    branding: {},
  },
});
```

The package also exports the `RevalidateTargetsConfig` and `RevalidateTargetPaths` types.

## `@sjolystinnovation/app-kit/server`

For server components and route handlers only. It imports `next/cache`, `next/constants`, and
`next/server`.

### `createPublicApi`

`createPublicApi(baseUrl, options?)` returns cached GETs against the API's anonymous endpoints:

- `publicGet(path, { tags?, revalidate? })` gives the data, or `null` when the API answers 404. An unreachable or
  failing API throws `PublicApiError`, so a failed fetch is never cached as an empty page in place
  of a working one.
- `publicGetOptional(path, { tags?, revalidate? })` gives `null` on any failure, for data a page can do without.
- `publicGetWithMeta(path, { tags?, revalidate? })` also gives `lastModified`, from the `Last-Modified` header.

Responses stay fresh for 60 seconds unless `options.revalidate` says otherwise. A call can set its own
`revalidate` in seconds, which wins over the instance's. Use `0` for a page that must read live data,
such as a checkout, and `false` to cache without an end. A call that sets none keeps the instance's. An empty `baseUrl`
throws. Each path starts with a single `/`, or the call throws. A path with a `.` or `..` segment,
encoded or not, gives `null` without a request, the same as a 404. Run a slug or other user input
through `encodeURIComponent` before you put it in a path.

```ts
// src/lib/publicApi.ts
import { requireEnv } from "@sjolystinnovation/app-kit";
import { createPublicApi } from "@sjolystinnovation/app-kit/server";

export const { publicGet, publicGetOptional, publicGetWithMeta } = createPublicApi(
  requireEnv("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL),
);
```

`next build` prerenders the pages that call these, so by default a build fails when the API is down.
Set `nullOnFailureDuringBuild: true` to build those pages empty instead. During the build, an
unreachable API or an error answer gives `null` and logs a warning with the path and status, so the
empty page shows in the build log. ISR fills the page on its first revalidate once the API answers.
At runtime a failure still throws, so a working page is never replaced by an empty one.

```ts
export const { publicGet, publicGetOptional, publicGetWithMeta } = createPublicApi(
  requireEnv("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL),
  { nullOnFailureDuringBuild: true },
);
```

The package also exports the `PublicApiOptions`, `PublicGetOptions`, and `PublicResponse` types.

### `createRevalidateRoute`

`createRevalidateRoute({ targets, role })` returns a `POST` handler for `app/api/revalidate/route.ts`.
Each target maps to the page paths it purges. A path with a dynamic segment, such as
`/builds/[slug]`, purges every page of that route. The route also purges the target name as a cache
tag, so tag the fetches behind it with the same name.

The handler answers 403 unless the caller has a live session with `role`: signed in within the last
seven days, with no refused refresh, and with an access token that has not expired. It answers 415
unless the caller sends the body as JSON, which the `revalidate` from `defineRevalidateTargets`
does. It answers 400 for a target it does not know.

```ts
// src/app/api/revalidate/route.ts
import { createRevalidateRoute } from "@sjolystinnovation/app-kit/server";
import { TARGET_PATHS } from "@/lib/cacheTags";

export const POST = createRevalidateRoute({ targets: TARGET_PATHS, role: "Admin" });
```

`targets` can also be a plain object, such as
`{ builds: ["/builds", "/builds/[slug]", "/sitemap.xml"] }`. The package also exports the
`RevalidateRouteOptions` type.

## `@sjolystinnovation/app-kit/company`

The company details for public pages, such as a footer or a contact page. The entry imports no
peer dependency, so a static site without axios or next-auth can use it.

`mergeCompanyInfo(data, fallback)` gives the company details: the API's `/company` answer, with the
app's own value for each field it left blank or could not give. Only the fallback's name is
required. The legal name falls back to the name, and VAT to not registered.

`formatOrgNumber({ orgNumber, vatRegistered })` adds ` MVA` once the business is VAT registered, and
gives an empty string without a number.

```ts
// src/lib/companyInfo.ts
import { formatOrgNumber, mergeCompanyInfo, type CompanyInfo } from "@sjolystinnovation/app-kit/company";

export const getCompanyInfo = async () =>
  mergeCompanyInfo(await publicGetOptional<CompanyInfo>("/company"), { name: "Example AS" });

export const orgLine = (company: CompanyInfo) => formatOrgNumber(company);
```

The `CompanyInfo` and `CompanyFallback` types describe the two shapes.

## `@sjolystinnovation/app-kit/forms`

`useFormDraft(config, options)` keeps a form's values in `localStorage`, so a sign-out, reload, or
closed tab does not lose them. The hook writes values half a second after the last change, so only
that last half second is at risk.

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

It returns a `FormDraft`:

- `pending`, the stored draft. The page offers it to the user and does not apply it. The hook reads
  it when the owner is first known, and again whenever the owner or `scope` changes, so it can
  appear after the form mounts.
- `dismiss()`, to stop offering it.
- `clear()`, to drop the stored draft after a successful save.

The hook stores drafts under `<draftStoragePrefix>:draft:<owner>:<scope>`. It throws when
`draftStoragePrefix` is empty or contains a colon. It does not offer a draft older than 7 days, and
removes that draft when its form next reads it. The options type is `FormDraftOptions`.

## `@sjolystinnovation/app-kit/toast`

sonner's `toast`, except that `toast.error` shows nothing while the re-sign-in prompt is open. The
prompt already says why the request failed. Every other toast passes through, and so do the error
states of `toast.promise`. Render sonner's `Toaster` in the app as usual.

```ts
import { toast } from "@sjolystinnovation/app-kit/toast";

toast.error("Could not save.");
```

## `@sjolystinnovation/app-kit/validation`

### `passwordSchema`

`passwordSchema(strings?)` is a zod schema for a new password, with the rules the APIs enforce
through ASP.NET Identity: at least 8 characters, with a lowercase letter, an uppercase letter, and a
digit. No symbol is needed. Identity counts only ASCII, so the letters are A to Z and the digits 0 to
9. "Å" does not count as uppercase. Identity sets no upper limit. If the app's API sets one, add it
with `.max()`. A failing password gets one issue per rule it breaks, each with its message from
`strings`. Missing messages fall back to `defaultPasswordStrings`, which are English.

```ts
import { passwordSchema } from "@sjolystinnovation/app-kit/validation";

const result = passwordSchema({ uppercase: "Ta med en stor bokstav fra A til Z." }).safeParse(newPassword);
const withLimit = passwordSchema().max(128, "Be at most 128 characters long.");
```

`PASSWORD_MIN_LENGTH` holds the minimum, for hint text. `passwordProblems(password, strings?)` gives
the message of every rule a password breaks, in the same order, without zod. The messages type is
`PasswordStrings`.

### `zodFieldErrors`

`zodFieldErrors(error, options?)` groups a failed parse's issues by the top-level field they belong
to, for showing beside each input. Each field gets its first issue's message, or every message in
order with `all: true`. `message` replaces zod's text, such as with the app's own translations. Its
type is `IssueMessage`. Issues that belong to no field are left out.

```ts
import { zodFieldErrors } from "@sjolystinnovation/app-kit/validation";

const parsed = contactSchema.safeParse(form);
if (!parsed.success) setErrors(zodFieldErrors(parsed.error, { message: issue => issueMessage(issue, dict) }));
```

## `@sjolystinnovation/app-kit/ui`

Form controls, alerts, images, and error pages. The components use Tailwind CSS and take their look
from the [theme variables](#theming).

### `TextInput`

A labeled text field with the same look and props as `PasswordInput`, apart from the show and hide
toggle. It takes the other `<input>` attributes too.

```tsx
<TextInput label="Email" name="email" type="email" required error={errors.email} />
```

### `PasswordInput`

A labeled password field with a button that shows and hides the value. It also takes the other
`<input>` attributes, apart from `type`, which the component switches itself.

```tsx
<PasswordInput label="Password" name="password" required error={errors.password} />
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `string` | | The visible label, tied to the input. |
| `error` | `string` | | The message under the field. It turns the border red, marks the input invalid, and screen readers read it out with the field. |
| `showPasswordLabel` | `string` | `"Show password"` | The toggle's accessible name while the value is hidden. |
| `hidePasswordLabel` | `string` | `"Hide password"` | The toggle's accessible name while the value is visible. |
| `className` | `string` | | Classes for placing the field, such as a margin. They go on the outer element around the label, input, and error. Restyle the field through the theme variables. |

Pass the two toggle labels in the app's language. The defaults are English.

### `TextArea`

A labeled multi-line field with the same look, label, and error handling as `TextInput`. It takes
the other `<textarea>` attributes too, and works controlled or uncontrolled.

```tsx
<TextArea label="Description" name="description" rows={4} maxRows={10} error={errors.description} />
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `string` | | The visible label, tied to the text area. |
| `error` | `string` | | The message under the field, which screen readers read out with it. |
| `autoGrow` | `boolean` | `true` | Whether the box grows with its text from `rows` lines up to `maxRows`, with no resize handle. With `false` it keeps its size and shows the handle. |
| `rows` | `number` | `3` | The lines shown when empty. |
| `maxRows` | `number` | `12` | The most lines an auto-growing box shows before it scrolls. |
| `className` | `string` | | Classes for placing the field, on the outer element. |

### `Toggle`

An on and off switch for a setting that takes effect at once. It takes the other `<button>`
attributes too.

```tsx
<>
  <Toggle label="Email notifications" checked={enabled} onChange={setEnabled} />
  <Toggle aria-label="VAT" checked={vat} onChange={setVat} disabled={saving} />
</>
```

| Prop | Type | Description |
| --- | --- | --- |
| `checked` | `boolean` | Whether the switch is on. |
| `onChange` | `(checked: boolean) => void` | Called with the new state. A callback that ignores it also fits. |
| `label` | `string` | The visible text after the switch. It names the switch, and a click on it flips the switch. |
| `aria-label` | `string` | The switch's name when there is no `label`. One of the two is required. |
| `disabled` | `boolean` | Whether the switch is grayed out and ignores clicks. |
| `className` | `string` | Classes for placing it, on the outer element. |

An `onClick` that calls `event.preventDefault()` stops the change.

### `Alert`

A colored message box.

```tsx
<Alert variant="error">{message}</Alert>
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant` | `"error" \| "success" \| "info" \| "warning"` | `"info"` | The color of the box. |
| `role` | `"alert" \| "status" \| "none"` | `"alert"` | A screen reader announces `status` without interrupting, on every change of its text. Use `none` when a separate live region announces the text. |
| `className` | `string` | | Classes for placing the alert, such as a margin. Restyle it through the theme variables. A clashing class wins or loses by the order Tailwind emits them in. |
| `children` | `ReactNode` | | The content. |

### `ContentImage`

An uploaded image from the content API, as a plain `<img>` with a `srcset` of the widths the API
serves. It goes through the content images rewrite from `defineAppConfig({ contentImages: true })`,
so the browser never contacts the API host. It works in a server component.

```tsx
<>
  <ContentImage imageId={post.imageId} alt={post.title} sizes="(min-width: 768px) 50vw, 100vw" />
  <ContentImage imageId={hero.imageId} fallbackSrc="/hero.jpg" alt="" sizes="100vw" priority aria-hidden />
</>
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `imageId` | `string \| null` | | The uploaded image's id. `null` or empty shows `fallbackSrc` as it is, with no `srcset`. |
| `alt` | `string` | | The alternative text. Empty for a decorative image. |
| `sizes` | `string` | | The widths the image is shown at. Required, since a browser assumes `100vw` without it. |
| `fallbackSrc` | `string` | | A static path for when there is no uploaded image. With neither, nothing renders. |
| `priority` | `boolean` | `false` | Whether this is the one image visible without scrolling. It loads eagerly, at high priority. |
| `width`, `height` | `number` | | The intrinsic size, to reserve space where the layout fixes no ratio. |
| `base` | `string` | `"/content-images"` | The path the content images rewrite serves. |
| `widths` | `number[]` | `[384, 640, 768, 1024, 1366, 1600]` | The widths in the `srcset`. The default matches the API's default variant widths. |
| `className` | `string` | | Classes on the `<img>`. |

`contentImagePath(id, base?)` and `contentImageSrcSet(id, widths?, base?)` build the same URLs for
other uses, such as a CSS background or an Open Graph image.

### `ErrorState`

What an `error.tsx` shows. It is a client component, as an error boundary has to be. It never shows
the error itself.

```tsx
// src/app/error.tsx
"use client";
import { ErrorState } from "@sjolystinnovation/app-kit/ui";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState reset={reset} homeHref="/" />;
}
```

| Prop | Type | Description |
| --- | --- | --- |
| `reset` | `() => void` | The `reset` that Next passes to `error.tsx`. The try again button calls it. |
| `homeHref` | `string` | Where the front page link goes, such as `/` or `/en`. |
| `strings` | `TextOverrides<ErrorStateStrings>` | `title`, `body`, `tryAgain`, and `home`. |
| `className` | `string` | Classes for placing it, on the outer element. |

### `NotFoundState`

What a `not-found.tsx` shows: a large code, the message as the page's heading, and a link home. It
works in a server component.

```tsx
<NotFoundState homeHref="/no" strings={{ body: dict.notFound, home: dict.toFrontPage }} />
```

| Prop | Type | Description |
| --- | --- | --- |
| `homeHref` | `string` | Where the home link goes. |
| `strings` | `TextOverrides<NotFoundStateStrings>` | `code`, `body`, and `home`. |
| `className` | `string` | Classes for placing it, on the outer element. |

### `ResetPasswordFlow`

The password reset page in two steps: the email asks for a code, then the code and a new password
set it. Before it sends the password, the flow checks it against the same rules as
`passwordSchema`, without loading zod. An emailed link with the email and code, such as an invite,
opens it on the second step. Its colors and title size come from the `auth` and `button` theme
variables.

```tsx
const params = useSearchParams();

<ResetPasswordFlow
  requestReset={UserService.requestPasswordReset}
  reset={UserService.resetPassword}
  loginHref="/login"
  initialEmail={params.get("email") ?? ""}
  initialCode={params.get("code") ?? ""}
  strings={{ title: "Tilbakestill passord", signInPrompt: null }}
/>;
```

| Prop | Type | Description |
| --- | --- | --- |
| `requestReset` | `(data: { email }) => Promise<unknown>` | Asks the API to email a code. |
| `reset` | `(data: { email, code, newPassword }) => Promise<unknown>` | Sets the password. When it succeeds, the flow shows `strings.done`. |
| `loginHref` | `string` | Where the sign-in links go. |
| `initialEmail`, `initialCode` | `string` | The values from the emailed link. A code opens the second step. |
| `className` | `string` | Replaces the outer `max-w-md mx-auto px-4 py-16`, such as to sit in the app's own card. |
| `strings` | `TextOverrides<ResetPasswordFlowStrings>` | The page's text. The English defaults include an intro, the password rules as `passwordHint`, and a `done` text. Set `signInPrompt`, `intro`, `codeSent`, or `passwordHint` to `null` to leave it out. The hint gives way to the new password's error while one shows, since the default `passwordInvalid` repeats the rules. `done` set to `null` shows the API's message, or only the sign-in link when it sends none. `passwordInvalid` set to `null` lists every broken rule. `validation` and `errors` may name only some codes. |
| `passwordStrings` | `TextOverrides<PasswordStrings>` | The rule messages, in the app's language. |

A password that breaks the rules is marked under the new password field, without a call to the API.
If the API refuses with a validation problem, the flow shows each error under its field. A field
error for a field the step does not show, and any other failure, goes in the message above the form.
The API's codes show in the app's language:

- `strings.validation` holds the field errors: `required`, `invalidEmail`, `passwordTooShort`,
  `passwordRequiresDigit`, `passwordRequiresLower`, `passwordRequiresUpper`, and
  `passwordRequiresNonAlphanumeric`. `{max}` in `passwordTooShort` becomes the API's least number of
  characters.
- `strings.errors` holds the other refusals: `invalidResetCode` and `tooManyResetAttempts`.

A code the app leaves out keeps its English default, which is the API's English message. For an
unknown code, such as `weakPassword` from a password rule the app adds, the flow shows the API's
message. A failure without a message shows `somethingWentWrong`. The types of these objects are
`ResetPasswordValidationStrings` and `ResetPasswordErrorStrings`.

## `@sjolystinnovation/app-kit/admin`

The admin area. The forms report with `toast`, so the app needs sonner and a `Toaster`.

### `AdminShell`

The frame: a title and a tab bar above the page, behind a `RoleGate`. It takes `RoleGate`'s `role`,
`fallback`, and `denied` or `deniedHref`. The tab whose `href` is the current path is active, with
`aria-current="page"`. Each tab is an `AdminTab`, `{ href, label }`.

```tsx
// src/app/[locale]/(protected)/admin/layout.tsx
"use client";
import type { ReactNode } from "react";
import { AdminShell } from "@sjolystinnovation/app-kit/admin";

export default function AdminLayout({ children }: { children: ReactNode }) {
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

### Field errors in the admin forms

`CompanySettingsForm`, `LegalPagesEditor`, and [`BrandingManager`](#brandingmanager) show an API
validation error under the field it belongs to, and toast the first one. A successful save clears
them. Each form's `strings.validation` holds the text for each error code that
SjolystInnovation.AppKit.SiteSettings sends. `validation` may name only some codes, and a code the
app leaves out keeps its English default. `{max}` in a text becomes the field's limit. For an
unknown code, or an API that sends no codes, the form shows the API's message.

| Form | Codes in `strings.validation` |
| --- | --- |
| `CompanySettingsForm` | `required`, `tooLong`, `invalidEmail`, `orgNumberRequiredForVat`, `invalidOrgNumber`, `invalidPostalCode`, and `placeRequired` |
| `LegalPagesEditor` | `required` and `tooLong` |
| `BrandingManager` | `invalidImage` and `imageTooLarge` |

The types of these objects are `CompanySettingsValidationStrings`, `LegalPagesValidationStrings`, and
`BrandingValidationStrings`.

### `CompanySettingsForm`

The admin form for the business details that the public pages show, saved through
`createSettingsService`. Its children show below the form once the settings have loaded, such as the
`BrandingManager`. `strings` holds every label, hint, and message, English by default.

```tsx
<CompanySettingsForm
  service={SettingsService}
  strings={{
    save: "Lagre",
    validation: { invalidOrgNumber: "Ikke et gyldig organisasjonsnummer.", tooLong: "Maks {max} tegn." },
  }}
>
  <BrandingManager save={BrandingService.update} />
</CompanySettingsForm>
```

| Prop | Type | Description |
| --- | --- | --- |
| `service` | `{ get, update }` | The settings calls, such as `createSettingsService(api)`. |
| `strings` | `TextOverrides<CompanySettingsFormStrings>`, with `validation` as `TextOverrides<CompanySettingsValidationStrings>` | The form's text. |
| `children` | `ReactNode` | The content below the form once the settings have loaded. |

### `LegalPagesEditor` and `LocaleTabs`

`LegalPagesEditor` edits the legal pages one page and one locale at a time, through
`createLegalService`. A locale tab whose page has no content yet gets a dot. A blank title or
content is marked under its field with `strings.validation.required` and toasts `strings.required`,
without a call to the API. An API validation error shows under its field while that page and locale
are open. `{max}` in `tooLong` becomes the title's limit. The pages come from `keys`, else the
service's `keys`, else `LEGAL_PAGE_KEYS`. A page missing from `keyLabels` takes its label from
`defaultLegalPageKeyLabels`, the English labels of the three default pages, or else shows its key.

```tsx
<LegalPagesEditor
  service={LegalService}
  keyLabels={{ terms: "Vilkår", privacy: "Personvern", cookies: "Informasjonskapsler" }}
  locales={["no", "en"]}
  localeLabels={{ no: "Norsk", en: "English" }}
  strings={{ save: "Lagre", validation: { required: "Fyll ut feltet.", tooLong: "Maks {max} tegn." } }}
/>
```

| Prop | Type | Description |
| --- | --- | --- |
| `service` | `{ keys?, listAll, save }` | The legal page calls, such as `createLegalService(api, publicApi)`. |
| `keys` | `readonly K[]` | The pages, in tab order. The editor opens on the first. Defaults to the service's `keys`, else `LEGAL_PAGE_KEYS`. |
| `keyLabels` | `Partial<Record<K, string>>` | Each page's tab label. A page left out uses `defaultLegalPageKeyLabels`, else its key. |
| `locales` | `readonly L[]` | The locales each page is written in. The editor opens on the first. |
| `localeLabels` | `Record<L, string>` | Each locale's tab label. |
| `strings` | `TextOverrides<LegalPagesEditorStrings>`, with `validation` as `TextOverrides<LegalPagesValidationStrings>` | The editor's text. |

`LocaleTabs` is the same tab bar on its own, for other translated forms:

```tsx
<LocaleTabs locales={["no", "en"]} labels={{ no: "Norsk", en: "English" }} active={locale} onChange={setLocale} filled={{ no: true, en: false }} />
```

### `AdminUsersPanel`

The users page. It lists every user with their roles, shows deleted users behind a toggle, gives
and takes roles, deletes an account after a confirm, and invites a user by email. It calls the API
through `createAdminUsersService`. The roles an admin may give come from the service's `roles`, or
from `getRoles` when the app passes it. A service without `roles` needs `getRoles`. You can pass
inline functions, because the panel does not fetch again when they change.

If the API refuses an invite with a validation problem, the panel shows each error under its field
and toasts one of them. An error for a field the form does not show goes in the toast first. The
API's codes show in the app's language:

- `strings.validation` holds the invite field errors: `required`, `tooLong`, `invalidEmail`,
  `unknownRole`, and `emailTaken`. `{max}` in `tooLong` becomes the field's limit.
- `strings.errors` holds the role and invite refusals: `unknownRole`, `ownAdminRole`, `lastAdmin`,
  `roleAssignFailed`, `roleRemoveFailed`, and `emailTaken`.
- `strings.deleteErrors` holds the delete refusals: `lastAdmin` and `accountChangeConflict`. The API
  sends `lastAdmin` for both a role and a delete, with a different message, so each has its own text.

A code the app leaves out keeps its English default, which is the API's English message. For an
unknown code, the panel shows the API's message. The types of these objects are
`AdminUsersValidationStrings`, `AdminUsersErrorStrings`, and `AdminUsersDeleteErrorStrings`.

```tsx
<AdminUsersPanel service={adminUsers} strings={dict.adminUsers} />
```

| Prop | Type | Description |
| --- | --- | --- |
| `service` | `ReturnType<typeof createAdminUsersService>` | The user admin calls. |
| `getRoles` | `() => Promise<string[]>` | The roles an admin may give. Defaults to the service's `roles`. |
| `defaultInviteRole` | `string` | The role a new invite starts with. Defaults to `Admin`. |
| `strings` | `TextOverrides<AdminUsersPanelStrings>` | The text. The panel fills in `{name}` and `{role}` where a text names them. `validation`, `errors`, and `deleteErrors` may name only some codes. |

### `StatHistoryChart`

Draws the admin stats over time: a line per series, a scale from zero to the highest value shown,
and legend buttons that hide and show each line. `data` is one row per day, oldest first, with
`date` as `YYYY-MM-DD`. A missing value counts as zero. Each series, a `StatSeries`, names the field
it plots and its label. It takes the next color of a built-in palette of five unless it has its own
`color`. `strings` holds `empty`, shown when there are no days, and `chart`, the accessible name.

```tsx
<StatHistoryChart
  data={history}
  series={[
    { key: "totalUsers", label: "Users" },
    { key: "contentImages", label: "Images" },
  ]}
  strings={{ empty: "No history yet.", chart: "Stats over time" }}
/>
```

### `EmailStatsPanel`

The stats page card for the transactional email, from the `MapAppKitEmailStats` endpoint of
SjolystInnovation.AppKit.Email through `createEmailStatsService`. It shows the emails sent,
delivered, bounced, and blocked or reported as spam, for the last `days` days. Hard and soft bounces
count together, and so do blocked emails and spam reports. With `separateCounts`, each count the API
returns gets its own row: hard bounces, soft bounces, blocked, spam reports, and invalid addresses.
The title names the days the API answered for. While the stats load, the panel shows `loading`.
When they cannot load, such as when Brevo does not answer, it shows `unavailable` without a toast.
The panel loads again when the days change, not when an inline `service` does, and shows `loading`
until the new days answer.

Give `periods` to let an admin pick the days with a row of buttons next to the title. The panel then
keeps the picked days itself, starting on `days`. Give `onDaysChange` as well to keep the days in the
app, which then passes the picked days back as `days`.

```tsx
<EmailStatsPanel service={createEmailStatsService(api)} strings={{ title: "E-post (siste {days} dager)" }} />

<EmailStatsPanel service={createEmailStatsService(api)} periods={[7, 30, 90]} separateCounts />
```

| Prop | Type | Description |
| --- | --- | --- |
| `service` | `{ get(days?) }` | The email stats call, such as `createEmailStatsService(api)`. |
| `days` | `number` | How many days back the stats go. Defaults to 30. With `periods` and no `onDaysChange`, the days the picker starts on. |
| `periods` | `readonly number[]` | The days an admin can pick between, such as `[7, 30, 90]`. Without it, there is no picker. |
| `onDaysChange` | `(days: number) => void` | Called with the picked days. Give it to control `days` from the app. |
| `separateCounts` | `boolean` | Shows each count on its own row. Defaults to `false`. |
| `strings` | `TextOverrides<EmailStatsPanelStrings>` | `title` and `periodOption`, where `{days}` becomes the days, `sent`, `delivered`, `bounces`, `blocked`, `loading`, and `unavailable`, the rows of `separateCounts` in `hardBounces`, `softBounces`, `blockedOnly`, `spamReports`, and `invalid`, and `period`, the picker's name for screen readers. |
| `className` | `string` | Replaces the card's border and spacing, `rounded-2xl border border-admin-border p-5`, such as to sit in the app's own card. |

## `@sjolystinnovation/app-kit/branding`

The logo and favicon an admin uploads, as the API's `/branding` endpoint returns them. The shape is
the `Branding` type.

### `BrandingProvider` and `useBranding`

`BrandingProvider` holds the branding for the components below it. It takes the branding the server
rendered with, loads it on mount when there is none, and loads it again every five minutes, so an
open tab picks up a change. A failed load keeps what it has. `useBranding()` gives a
`BrandingContextValue`: `branding`, `logoUrl` as a `data:` URL or `null`, and `refresh()`.

```tsx
"use client";
import type { ReactNode } from "react";
import { BrandingProvider, useBranding, type Branding } from "@sjolystinnovation/app-kit/branding";

export function Providers({ initial, children }: { initial: Branding; children: ReactNode }) {
  return (
    <BrandingProvider load={BrandingService.get} initial={initial}>
      {children}
    </BrandingProvider>
  );
}

export function Logo() {
  const { logoUrl } = useBranding();
  return <img src={logoUrl ?? "/logo.png"} alt="" />;
}
```

### `BrandingManager`

The admin form for uploading or removing the logo and favicon. It needs a `BrandingProvider` above
it, and refreshes it after a save. If the API refuses a file, the form shows the reason under that
image and toasts it. A successful save clears it. See
[Field errors in the admin forms](#field-errors-in-the-admin-forms) for `strings.validation`.

```tsx
<BrandingManager
  save={form => BrandingService.update(form)}
  strings={{ validation: { invalidImage: "Ugyldig filformat. Last opp en bildefil.", imageTooLarge: "Filen er for stor. Last opp en fil på 2 MB eller mindre." } }}
/>
```

| Prop | Type | Description |
| --- | --- | --- |
| `save` | `(form: FormData) => Promise<unknown>` | Sends `logo` and `icon` files, and `removeLogo` and `removeIcon` set to `true`. Throw to show the error's message. |
| `strings` | `TextOverrides<BrandingManagerStrings>`, with `validation` as `TextOverrides<BrandingValidationStrings>` | The form's text. |

## `@sjolystinnovation/app-kit/branding/server`

Server only. `brandingIcon({ load, fallbackPath, fallbackType })` is the response for an
`app/icon.ts` route. It serves the favicon set in admin settings when it is a PNG, JPEG, WebP, GIF,
or ICO, and the bundled file otherwise, since an SVG or HTML upload could run script on the site's
origin. Both carry `nosniff` and a sandbox CSP, which a CSP header from the app's `next.config`
replaces. If the route cannot load the branding, it answers 503 with `no-store`, since a browser
would cache the bundled icon in place of the one set in settings.

```ts
// src/app/icon.ts
import { join } from "node:path";
import type { Branding } from "@sjolystinnovation/app-kit/branding";
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
fetch and revalidate the tag after a save, so a new icon shows at once.

`iconVersion(data)` is a short digest of the icon bytes, for a manifest icon URL such as
`/icon?v=<digest>`, since Android refreshes a home screen icon only when the manifest changes. The
options type is `BrandingIconOptions`.

## `@sjolystinnovation/app-kit/markdown`

Renders Markdown from an editor or the API, with GitHub tables, task lists, and footnotes. It never
renders raw HTML and sanitizes the output, so the text cannot inject scripts, styles, event
handlers, or `javascript:` links. It works in a server component. It needs `react-markdown`,
`remark-gfm`, and `rehype-sanitize`.

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
| `externalLinks` | `boolean` | `false` | Whether to open `http` and `https` links in a new tab with `rel="noopener noreferrer"`. Site-relative links stay in the tab. |
| `className` | `string` | | Wraps the output in a `div` with these classes. Without it the elements render bare, so a parent's `space-y-*` spaces them. |

The text takes its color and size from the parent. A level one heading becomes a level two, since
the page has its own `h1`.

## `@sjolystinnovation/app-kit/legal`

`LegalPageView` renders a legal page, such as terms, privacy, or cookies, as an admin wrote it: the
title, the date it last changed in `dateLocale`, and the Markdown body. If there is no page, it shows
`title` and says the page is missing. It is a server component and needs the same peers as
`markdown`, but neither axios nor next-auth. The route file stays in the app, since Next reads
`revalidate` and the metadata from it.

The entry point also exports the `LegalPage` type, the same one as `api` exports, so a site without
sign-in can type the page without that entry. `LEGAL_PAGE_KEYS` and its `DefaultLegalPageKey` type
are the default pages of the API and of `createLegalService`.

```tsx
// src/app/[locale]/terms/page.tsx
import { LegalPageView, type LegalPage } from "@sjolystinnovation/app-kit/legal";

export const revalidate = 3600;

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const page = await publicGet<LegalPage>(`/content/legal/terms?locale=${locale}`, { tags: [REVALIDATE_TARGETS.legal] });
  return <LegalPageView page={page} title="Terms" homeHref={`/${locale}`} dateLocale="nb-NO" />;
}
```

| Prop | Type | Description |
| --- | --- | --- |
| `page` | `LegalPage \| null` | The page from the API, or `null` when nobody has written it yet. |
| `title` | `string` | The heading while there is no page. |
| `homeHref` | `string` | The front page's path, for the link at the bottom. |
| `dateLocale` | `string` | The BCP 47 tag the date is written in, such as `nb-NO`. |
| `strings` | `TextOverrides<LegalPageViewStrings>` | The page's text. |

## `@sjolystinnovation/app-kit/sections`

A page built from sections an admin edits: the section types, a renderer registry, and an editor
registry. The shared types are `hero`, `feature`, `text`, `feed`, `contact`, `cta`, `stats`, and
`image`, listed in `SHARED_SECTION_TYPES`. Each section has an `id`, a `type`, and `visible`. The
renderer needs the same peers as `markdown`, and the editor needs sonner.

### Section types and `createSectionFactory`

`Sections<Extensions, LiveStatSources>` is the union of the shared section types. `Extensions` adds
the app's own fields to a type. `LiveStatSources` names the live numbers a stats item can show
besides a static value. An app adds its own section types by adding them to the union.
`SectionOf<Section, "stats">` picks one member.

`createSectionFactory(templates)` builds the app's `createSection(type)` from one template per type.
Each call gives a new id, `visible: true`, and its own copy of the template, so two sections never
share an array. `cloneSection(section)` copies a section with a new id.

```ts
// src/types/content.ts
import { createSectionFactory, type Sections } from "@sjolystinnovation/app-kit/sections";

export type Section = Sections<{ hero: { backgroundImageId: string | null } }, "builds" | "parts">;

export const createSection = createSectionFactory<Section>({
  hero: { heading: "Heading", subheading: "", primaryLabel: "", primaryHref: "#contact", secondaryLabel: "", secondaryHref: "", backgroundImageId: null },
  feature: { heading: "Feature", text: "", bullets: [] },
  text: { heading: "Heading", body: "" },
  feed: { heading: "Latest builds", limit: 3 },
  contact: { heading: "Contact us", text: "" },
  cta: { heading: "Get started", text: "", primaryLabel: "", primaryHref: "" },
  stats: { heading: "", items: [] },
  image: { imageId: null, alt: "", caption: "", layout: "standard", text: "" },
});
```

The member types are `HeroSection`, `FeatureSection`, `TextSection`, `FeedSection`,
`ContactSection`, `CtaSection`, `StatsSection` with its `StatItem`, and `ImageSection` with its
`ImageLayout`. `BaseSection`, `SharedSectionType`, `SectionExtensions`, and `SectionTemplates` are
the building blocks.

### `SectionRenderer`

`SectionRenderer` renders one section through the renderer for its type. It holds no state, so it
works in a server component. A hidden section, or a type with no renderer, renders nothing.

The built-in renderers cover `hero`, `feature`, `text`, `contact`, `cta`, and `image`. `feed` and
`stats` have no default, since only the app knows its items and its live numbers. The `renderers`
prop, a `SectionRenderers<Section>`, replaces a default for the same type and adds the app's own
types. Each renderer is a `SectionRenderFn`: it gets the
section and the render context.

| Prop | Type | Description |
| --- | --- | --- |
| `section` | `Section` | The section to render. |
| `renderers` | `SectionRenderers<Section>` | The app's renderers by type. |
| `context` | `Partial<SectionRenderContext>` | The app's pieces. Anything left out keeps its default. |

| `context` key | Default | Description |
| --- | --- | --- |
| `href` | the path as it is | Maps a button's path, such as `path => localeHref(locale, path)`. |
| `Link` | `SmartLink` | The button link. It gets `SectionLinkProps`. `SmartLink` scrolls to a `#anchor` and uses next/link for the rest. |
| `Image` | `ContentImage` | The image in image sections. It gets `SectionImageProps`: `imageId`, `alt`, `sizes`, `className`, and `width` and `height` where the layout keeps the ratio. |
| `imageDimensions` | `{}` | The intrinsic sizes by image id, as `ImageDimensions`. |

The defaults that take options come from factories: `createTextRenderer({ bodyClassName })`,
`createContactRenderer({ form, className })`, and `createImageRenderer({ intrinsicSize })`. Their
option types are `TextRendererOptions`, `ContactRendererOptions`, and `ImageRendererOptions`.
`heroRenderer`, `featureRenderer`, and `ctaRenderer` take no options. For a different hero, register
your own.

```tsx
// src/components/SectionRenderer.tsx
import {
  SectionRenderer as BaseSectionRenderer,
  createContactRenderer,
  type SectionRenderers,
} from "@sjolystinnovation/app-kit/sections";
import type { Section } from "@/types/content";

const renderers: SectionRenderers<Section> = {
  contact: createContactRenderer({ form: <ContactForm /> }),
  feed: section => <FeaturedBuilds heading={section.heading} limit={section.limit} />,
  stats: section => <StatsBand section={section} />,
};

export default function SectionRenderer({ section, locale }: { section: Section; locale: string }) {
  return <BaseSectionRenderer section={section} renderers={renderers} context={{ href: path => `/${locale}${path}` }} />;
}
```

### `SectionsEditor`

`SectionsEditor` is the controlled admin editor: a card per section with hide, move, duplicate, and
remove, the type's fields, and an add list.

The editor has a built-in editor for each shared type. The `editors` prop, a
`SectionEditors<Section>`, replaces an editor for the same type and adds the app's own types. Each
editor is a component that gets `SectionEditorProps`: `section`, `patch(changes)`, `strings`, and
`images`. The stats editor offers only the manual number until the app registers its live sources.

| Prop | Type | Description |
| --- | --- | --- |
| `sections` | `Section[]` | The sections, in page order. |
| `onChange` | `(sections: Section[]) => void` | Called with the new list after every change. |
| `createSection` | `(type) => Section` | Makes a new section of a type, such as the one from `createSectionFactory`. |
| `images` | `SectionImages` | The app's `upload(file)`, which resolves to `{ id }`, and an optional preview `src(id)`. The preview defaults to `contentImagePath`. |
| `editors` | `SectionEditors<Section>` | The app's editors by type. |
| `types` | `readonly Section["type"][]` | The types the add list offers, in order. Defaults to `SHARED_SECTION_TYPES`. An app with a type of its own passes `[...SHARED_SECTION_TYPES, "gallery"]` with an editor for it in `editors`. |
| `initialAddType` | `Section["type"]` | The add list's first choice. Defaults to the first of `types`. |
| `cloneSection` | `(section) => Section` | Copies a section for duplicate. Defaults to `cloneSection`. |
| `strings` | `TextOverrides<SectionsEditorStrings>` | The editor's text. |
| `typeLabels` | `Partial<Record<Section["type"], string>>` | The name of each type, on its badge and in the add list. Defaults to `defaultSectionTypeLabels`. |
| `unwrapped` | `boolean` | Whether to leave out the wrapping element, for a page that already spaces its children. |

Build an app editor from the exported ones. `HeroSectionEditor` takes `media` between the subheading
and the buttons. `FeedSectionEditor` takes `children` and the grid `className`. `StatsSectionEditor`
takes the live `sources`, each a `StatSource`. The other editors are `FeatureSectionEditor`,
`TextSectionEditor`, `ContactSectionEditor`, `CtaSectionEditor`, and `ImageSectionEditor`.
`ImagePicker` and `SectionField` work on their own in an app's editor.

```tsx
"use client";
import { useState } from "react";
import { SectionsEditor, StatsSectionEditor, type SectionEditorProps, type SectionOf } from "@sjolystinnovation/app-kit/sections";
import { createSection, type Section } from "@/types/content";

const Stats = (props: SectionEditorProps<SectionOf<Section, "stats">>) => (
  <StatsSectionEditor {...props} sources={[{ value: "builds", label: "Published builds (live)", defaultItemLabel: "Builds" }]} />
);

export function HomePageEditor({ initial }: { initial: Section[] }) {
  const [sections, setSections] = useState(initial);
  return (
    <SectionsEditor
      sections={sections}
      onChange={setSections}
      createSection={createSection}
      images={{ upload: ImageService.upload }}
      editors={{ stats: Stats }}
    />
  );
}
```

## `@sjolystinnovation/app-kit/seo`

Search engine helpers for one site: canonical URLs with hreflang, page metadata with Open Graph,
sitemap entries, `robots.txt`, and schema.org structured data. It works in a server component.
`defineSite` binds them to the site's name, canonical origin, and locales:

```ts
// src/lib/seo/site.ts
import { defineSite } from "@sjolystinnovation/app-kit/seo";

export const site = defineSite({
  name: "Example",
  url: "https://www.example.com",
  titleSeparator: " | ",
  locales: ["no", "en"],
  defaultLocale: "no",
  localeTags: { no: "no", en: "en" },
  tagline: locale => (locale === "no" ? "Et eksempel" : "An example"),
});
```

| Option | Type | Description |
| --- | --- | --- |
| `name` | `string` | The site's name, in titles, Open Graph, and structured data. |
| `url` | `string` | The canonical origin, without a trailing slash. |
| `titleSeparator` | `string` | The text between a page title and the site name. |
| `locales` | `string[]` | The locale segments every page is under. A site without them leaves it out, and its paths have no segment. |
| `defaultLocale` | `string` | The locale `x-default` points at. Defaults to the first. |
| `localeTags` | `Record<locale, string>` | The BCP 47 tag per locale. Defaults to the locale. |
| `tagline` | `(locale) => string` | The line after the name in the default title and the share image's alt text. |
| `shareImagePath` | `string` | The share image route below each locale. Defaults to `/og`. |

The site provides:

- `localePath(locale, path)`, `absoluteUrl(path)`, `absoluteLocaleUrl(locale, path)`, and
  `languageAlternates(path)`. Paths get a leading slash and no trailing slash.
- `siteMetadata({ locale, description, manifest })` for the locale root layout: the title template,
  `metadataBase`, the index directive, and the front page's canonical.
- `pageMetadata({ locale, path, title, description, images })` for a page: the canonical URL,
  hreflang, and Open Graph with the locale's share image unless `images` is given.
- `localeEntries(path, { locales, lastModified })` for `sitemap.ts`: one entry per locale, each
  listing the others. It leaves out `lastModified` when that is unknown. A site without locales gets
  one entry per page.
- `forEachLocale(load)` runs `load` for every locale at once and keys the results by locale.
- `legalEntries({ keys, updatedAt })` gives the legal pages' entries, `/terms`, `/privacy`, and
  `/cookies` unless `keys` says otherwise, such as the legal service's `keys`. Each is dated by the
  timestamp `updatedAt` returns for it.
- `robots({ privatePaths, privateRootPaths, indexable })` for `robots.ts`. It disallows the private
  paths under every locale segment. A deployment that is not production disallows everything.
- `organizationNode(company, { type, sameAs, country, image, logo })`, `webSiteNode(locale)`,
  `breadcrumbNode(crumbs, pageUrl)`, `itemListNode(paths, pageUrl)`, `siteId(fragment)`, and `ids`
  for structured data.

```tsx
// src/app/robots.ts
export const dynamic = "force-dynamic";
export default () => site.robots({ privatePaths: ["/admin", "/login"], privateRootPaths: ["/api/"] });
```

```tsx
// src/app/sitemap.ts
export const revalidate = 3600;
export default async () => [
  ...site.localeEntries(""),
  ...(await site.legalEntries({
    updatedAt: async (key, locale) => (await publicGet<LegalPage>(`/content/legal/${key}?locale=${locale}`))?.updatedAt,
  })),
];
```

```tsx
// in a page
<JsonLd nodes={[site.organizationNode(company), site.webSiteNode(locale)]} />
```

`isIndexableEnvironment()` reads `SITE_ENV`. `prod`, `production`, and unset or blank count as
production, so a missing variable never deindexes the live site. `robots.ts` needs
`dynamic = "force-dynamic"`, so it reads the variable per request.

The package also exports `JsonLd`, `serializeGraph`, `ref`, `NOINDEX`, `LEGAL_PAGE_KEYS`,
`SHARE_IMAGE_SIZE`, `latest`, and `parseTimestamp`, and the types `DefaultLegalPageKey`, `Site`, `SiteConfig`,
`SiteMetadataInput`, `PageMetadataInput`, `LocaleEntryOptions`, `LegalEntriesInput`, `RobotsInput`,
`OrganizationOptions`, `OrganizationInfo`, `Crumb`, `SchemaNode`, and `SchemaRef`.

## `@sjolystinnovation/app-kit/seo/og`

`shareImage({ name, tagline, colors })` renders the default share preview, a PNG at
`SHARE_IMAGE_SIZE`: the name, a bar in `colors.primary`, and the tagline. The colors are literals,
since the image renders outside the browser. Return it from the route that `pageMetadata` points at.
It is a route, not the `opengraph-image` file convention, since a page's own `openGraph` block
replaces that image.

```tsx
// src/app/[locale]/og/route.tsx
import { shareImage } from "@sjolystinnovation/app-kit/seo/og";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return shareImage({
    name: site.name,
    tagline: locale === "no" ? "Et eksempel" : "An example",
    colors: { background: "#0f172a", foreground: "#ffffff", primary: "#38bdf8" },
  });
}
```

The options type is `ShareImageInput`.

## `@sjolystinnovation/app-kit/payments`

The page a user comes back to from a payment provider, such as after approving a Vipps payment or
agreement. The .NET side of the Vipps calls is `SjolystInnovation.AppKit.Vipps` on NuGet.

`usePollUntilFinal(fetcher, isFinal, { retries, delayMs })` fetches until the value is final, since
the provider may confirm a moment after the user is back. It polls every 4 seconds, 8 more times at
most, and stops on a failed fetch and on unmount. It gives `data`, `loading`, and `refresh()`, and
each fetch uses the latest `fetcher` and `isFinal`. Its types are `PollOptions` and `PollResult`.

`PaymentReturn` shows the outcome: confirmed, still pending, or failed. It takes the text and the
way on for each state. When you pass `onRefresh`, it shows a refresh button while pending.

```tsx
"use client";
import { PaymentReturn, usePollUntilFinal } from "@sjolystinnovation/app-kit/payments";

export function OrderReturn({ orderId }: { orderId: string }) {
  const { data: order, loading, refresh } = usePollUntilFinal(
    () => ShopService.getOrder(orderId),
    o => o != null && o.status !== "Pending",
  );
  if (loading) return <p>Loading…</p>;

  return (
    <PaymentReturn
      state={order?.status === "Paid" ? "success" : order?.status === "Pending" ? "pending" : "failed"}
      success={{ title: "Payment received!", body: "Your order is confirmed.", href: "/shop", cta: "Back to shop" }}
      pending={{ title: "Payment pending", body: "Vipps is confirming it.", note: "You get a receipt by email.", href: "/profile/billing", cta: "View billing" }}
      failed={{ title: "Payment failed", body: "No charge was made.", href: "/shop", cta: "Try again" }}
      onRefresh={refresh}
    />
  );
}
```

| Prop | Type | Description |
| --- | --- | --- |
| `state` | `"success" \| "pending" \| "failed"` | Which content to show. The type is `PaymentReturnState`. |
| `success`, `pending`, `failed` | `{ title, body, href, cta, note?, extra? }` | The text, the button's target and text, a smaller note line, and anything more, per state. The type is `PaymentReturnContent`. |
| `onRefresh` | `() => void` | Shows a refresh button while pending. |
| `refreshLabel` | `string` | The refresh button's text. Defaults to `Check again`. |
| `className` | `string` | Classes for placing it, on the outer element. |

`formatNok(ore)` formats øre as kroner, such as `NOK 373,75`.

## `@sjolystinnovation/app-kit/locales/nb`

Norwegian (bokmål) text for every component that takes `strings`, one complete object per
component, typed against its strings type. Pass an object as it is, or spread it and change a few
keys. The field errors follow Norwegian public services. They name the field or the problem first,
say what is wrong and how to fix it, and use Altinn's phrasing, such as "Du må fylle ut" and "Bruk
{max} eller færre tegn". The entry point imports no peer dependency, so a server component can use
it.

| Export | For |
| --- | --- |
| `nbCredentialsFormStrings` | `CredentialsForm`, and `formStrings` of `LoginPage` and `SessionExpiryGuard` |
| `nbLoginPageStrings` | `LoginPage` |
| `nbSessionExpiryGuardStrings` | `SessionExpiryGuard` |
| `nbResetPasswordFlowStrings` | `ResetPasswordFlow`, with its field error and refusal codes |
| `nbPasswordStrings` | `passwordSchema`, `passwordProblems`, and `passwordStrings` of `ResetPasswordFlow` |
| `nbErrorStateStrings`, `nbNotFoundStateStrings` | `ErrorState` and `NotFoundState` |
| `nbCompanySettingsFormStrings` | `CompanySettingsForm`, with its field error codes |
| `nbAdminUsersPanelStrings` | `AdminUsersPanel`, with its field error, refusal, and delete codes |
| `nbLegalPagesEditorStrings`, `nbLegalPageKeyLabels` | `LegalPagesEditor` and its `keyLabels` for the default pages |
| `nbStatHistoryChartStrings` | `StatHistoryChart` |
| `nbEmailStatsPanelStrings` | `EmailStatsPanel` |
| `nbBrandingManagerStrings` | `BrandingManager`, with its refusal codes |
| `nbLegalPageViewStrings` | `LegalPageView` |
| `nbSectionsEditorStrings`, `nbSectionTypeLabels` | `SectionsEditor` and its `typeLabels` |

```tsx
import { CompanySettingsForm } from "@sjolystinnovation/app-kit/admin";
import { nbCompanySettingsFormStrings, nbCredentialsFormStrings, nbLoginPageStrings } from "@sjolystinnovation/app-kit/locales/nb";
import { LoginPage } from "@sjolystinnovation/app-kit/session/react";

<>
  <LoginPage redirectTo="/admin" resetHref="/reset-password" strings={nbLoginPageStrings} formStrings={nbCredentialsFormStrings} />
  <CompanySettingsForm service={SettingsService} strings={{ ...nbCompanySettingsFormStrings, saved: "Lagret" }} />
</>;
```

## `@sjolystinnovation/app-kit/testing`

Test doubles for the modules every app's tests mock: `next-auth/react`, `next/navigation`, `sonner`
or `@sjolystinnovation/app-kit/toast`. vitest hoists `vi.mock` above
the file's imports, so the factory imports the helpers itself. The test imports the same module to
set the state and read the spies. The state lasts for the whole file, so call `resetTestMocks`
before each test. It needs vitest 5.

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
  `useSession` returns. `auth.signIn`, `auth.signOut`, `auth.getSession`, and `auth.update` are the
  spies behind next-auth's calls.
- `navigation.pathname`, `navigation.searchParams`, and `navigation.router` feed `usePathname`,
  `useSearchParams`, and `useRouter`.
- `toastMock()` records every toast in `toastSpies`.

## Theming

The components draw every color, corner radius, and label size from theme variables in
`@sjolystinnovation/app-kit/styles.css`, with a light default. Set any of them in the app's own
`@theme` to restyle every component at once, or in a selector such as `.dark` for a scoped theme:

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
| `--spacing-field-label` | the gap under the label, `calc(var(--spacing) * 1)` |
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
| `--color-admin-tab`, `-hover` | gray 500 and gray 900, also the periods `EmailStatsPanel` has not picked |
| `--color-admin-tab-active` | gray 900 |
| `--color-admin-tab-indicator` | `var(--color-primary)`, the line under the active tab |
| `--color-chart-grid` | gray 200, the scale lines of `StatHistoryChart` |
| `--color-chart-label` | gray 400, the chart's numbers and dates |
| `--color-admin-stat-label` | gray 500, the labels and the waiting text of `EmailStatsPanel` |
| `--color-admin-stat-value` | gray 700, the numbers of `EmailStatsPanel` |
| `--radius-button` | `var(--radius-lg)` |
| `--color-button-primary-bg` | `var(--color-primary)`, also the period `EmailStatsPanel` has picked |
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
| `--color-markdown-border` | gray 200, rules, quotes, and table lines |
| `--color-markdown-code-bg`, `-code-text` | gray 100, gray 900 |
| `--radius-payment-button` | `var(--radius-button)`, the buttons on a `PaymentReturn` |
| `--color-payment-success`, `-pending`, `-failed` | green 600, amber 500, red 600, the icon on a `PaymentReturn` |
| `--color-payment-title`, `-text`, `-note` | gray 900, 600, 500 |
| `--color-payment-secondary-bg`, `-hover-bg`, `-text` | gray 100, 200, 700, its secondary link |

A default that points at another variable is read once for the whole page. The focus ring and the
primary button point at `--color-primary` and `--color-primary-foreground`. A scoped theme that
changes those also sets `--color-input-focus-ring`, `--color-button-primary-bg`, and
`--color-button-primary-text` in the same selector.

An app that clears a whole Tailwind namespace, such as `--color-*: initial`, clears these variables
with it and has to set the ones it uses itself.

## Requirements

- Next.js 16 and React 19.
- Tailwind CSS 4 for the components. The focus ring and the primary button use the theme's
  `primary` and `primary-foreground` colors, unless you set their own variables.
- TypeScript with `"moduleResolution": "bundler"`. Relative imports in the package are
  extensionless, which `node16` and `nodenext` reject.
- The package has no build output. Your app compiles its source with your own `compilerOptions`,
  and `skipLibCheck` does not exempt it.

## License

[Apache-2.0](https://github.com/sondresjolyst/si-web-packages/blob/main/packages/app-kit/LICENSE) © Sjølyst Innovation AS
