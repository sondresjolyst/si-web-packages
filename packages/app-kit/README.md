# @sjolystinnovation/app-kit

[![npm](https://img.shields.io/npm/v/@sjolystinnovation/app-kit.svg)](https://www.npmjs.com/package/@sjolystinnovation/app-kit)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

> Building blocks for Next.js apps that sign in against a JWT API through next-auth

Several apps sharing one API also share the code around it:

- the session plumbing
- how a failed request becomes a message a user can read
- the form controls on the sign in page

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

The components in `@sjolystinnovation/app-kit/ui` and `session/react` are styled with Tailwind CSS.
Import the package's stylesheet after Tailwind:

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "@sjolystinnovation/app-kit/styles.css";
```

## Usage

Declare the values that differ between apps once, then pass that config wherever it is needed. One
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

```ts
import { resolveJwtSecret } from "@sjolystinnovation/app-kit";
import { sessionConfig } from "@/lib/session";

const secret = resolveJwtSecret(sessionConfig, process.env);
```

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

### `resolveJwtSecret(config, env)`

`(config: SessionConfig, env: Record<string, string | undefined>) => string`

Reads the secret named by `config.jwtSecretEnvVar`. Throws when that variable is unset or empty,
with the variable's name in the message.

```ts
resolveJwtSecret(sessionConfig, { API_JWT_SECRET: "s3cret" });
// "s3cret"

resolveJwtSecret(sessionConfig, {});
// Error: Missing API_JWT_SECRET. The app verifies API session tokens with it.
```

The environment is a parameter, so the root entry point needs no Node types and works in browser
code. `@sjolystinnovation/app-kit/auth` is server only and does load Node types.

### `formatApiError(error, fallback, statusMessages?)`

`(error: unknown, fallback: string, statusMessages?: StatusMessages) => string`

Turns a failed request into one line a user can read.

On a 4xx response it uses the first of:

1. The body's own message: a text body, such as the one `BadRequest("...")` sends from ASP.NET Core,
   or `message`, the first validation error or `detail` from a JSON body.
2. The entry in `statusMessages` for the status.
3. `fallback`.

On a 5xx response the entry in `statusMessages` comes first, then the body, then `fallback`. A 5xx
body can come from a proxy, such as "Bad Gateway", so the caller's own words win when it has them.

A problem details `title` is never shown. ASP.NET Core fills it with generic text, such as "Bad
Request" or "An error occurred while processing your request.", which says less than `fallback`.

A few more rules:

- Key `0` in `statusMessages` covers a request that got no response, because of a dropped
  connection or a timeout.
- Only text on a single line counts as a message.
- Axios's own message, such as "Request failed with status code 500", is never shown.
- A cancelled request gives `fallback`.
- Any other `Error` gives its own message.
- A body requested as an `arraybuffer` or a `blob`, as for a file download, is not read. A failed
  download gets `statusMessages` or `fallback`.

```ts
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
| `apiUrl` | `string` | Base URL of the API. Sign-in posts to `/auth/login` and refresh to `/auth/refresh-token` under it. An empty value throws. |
| `env` | `Record<string, string \| undefined>` | The server environment, usually `process.env`. It supplies the secret named by `jwtSecretEnvVar`. |
| `http` | `AxiosInstance` | In place of `apiUrl`, for tests. The client for sign-in and refresh, with its own base URL. |

next-auth reads `NEXTAUTH_SECRET` itself and refuses to run in production without it.

What the options do:

- **Sign-in** posts `{ email, password }` and expects `{ token, refreshToken }`. The access token is
  verified with the API JWT secret, allowing 60 seconds of clock difference between the server and
  the API. Its `sub`, `unique_name` and `role` claims become the user's `id`, `name` and `roles`.
  The log gets the status, error code and message, never the request. A failed sign-in reports one
  of these in next-auth's `error`:
  - `SIGN_IN_ERRORS.unavailable` when the API does not answer, or a gateway returns 502, 503 or 504.
  - `SIGN_IN_ERRORS.invalidCredentials` for every other failure, including an unreadable token and
    an answer without both tokens.
- **Refresh** runs ahead of expiry: five minutes before it, or a quarter of the token's lifetime
  before it when that is shorter. It is never scheduled sooner than 30 seconds out, so a token that
  lives under 30 seconds is refreshed after it expires. Parallel reads of one session in one server
  process share a single refresh. Its answer is kept for a minute, because the API rotates the
  refresh token on every call.
- **Failures:** a 400 or 401 from the refresh ends the session with `RefreshTokenRejected`. Any
  other failure keeps it and tries again a minute later. A session without a refresh token ends with
  `NoRefreshToken` when its refresh falls due.
- **Cap:** the session ends seven days after sign-in with `AbsoluteSessionExpired`, however recently
  it was refreshed.
- **Session:** it carries `user`, `accessToken`, `error`, and `absoluteExpiresAt`, the end of the
  seven days in milliseconds.
- **Sign-in page:** `pages.signIn` is `config.loginRoute`.

Two rules keep a refresh from being lost:

- Read the session on the client, through `useSession` or `getSession`. In the App Router,
  `getServerSession(authOptions)` cannot store a cookie, in server components, route handlers and
  server actions alike. A refresh there replaces the tokens at the API and loses the new ones. The
  next refresh then reuses the old token, and the API revokes every session the user has. On the
  server, read the token with `getToken` from `next-auth/jwt`, which never refreshes.
- Run the app as one server process. Parallel session reads share one refresh only within a process.
  Two replicas can refresh the same token at once, with the same result.

The package does not declare these fields on next-auth's types. The app declares them, so its own
code can read them:

```ts
// src/types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: { id: string; name: string; email: string; roles: string[] };
    accessToken: string;
    error?: string | undefined;
    absoluteExpiresAt?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    refreshAt?: number;
    loginAt?: number;
    user?: { id: string; name: string; email: string; roles: string[] };
    error?: string | undefined;
  }
}
```

### `@sjolystinnovation/app-kit/api`

`createApiClient(baseURL)` returns an axios instance for the signed-in API, for code that runs in
the browser. It reads the session through next-auth's `getSession`, which has no cookies to read on
the server. An empty `baseURL` throws. Each request carries the session's access token. A 401
opens the re-sign-in prompt when the session is gone or has a terminal error. It does not sign
the user out, so the page keeps its state. The error still rejects as usual.

`request(call, fallback, statusMessages?)` runs a call and returns its `data`. A failure becomes an
`Error` with the message `formatApiError` gives it. A cancelled call rethrows the cancel unchanged:

```ts
import { requireEnv } from "@sjolystinnovation/app-kit";
import { createApiClient, request } from "@sjolystinnovation/app-kit/api";

const api = createApiClient(requireEnv("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL));

export const getRecipe = (id: number) =>
  request(() => api.get<Recipe>(`/recipes/${id}`), "Could not load the recipe.");
```

`requestRevalidate(target, endpoint?)` asks the app's revalidate route to purge the pages behind
`target`, so an edit shows at once. It posts to `/api/revalidate` unless `endpoint` says otherwise.
It never throws. On failure the pages' own revalidate window is the fallback.

### `@sjolystinnovation/app-kit/server`

For server components and route handlers only. It imports `next/cache` and `next/server`.

`createPublicApi(baseUrl, options?)` returns cached GETs against the API's anonymous endpoints:

- `publicGet(path, { tags? })` gives the data, or null when the API answers 404. An unreachable or
  failing API throws `PublicApiError`, so a failed fetch is never cached as an empty page in place
  of a working one.
- `publicGetOptional(path, { tags? })` gives null on any failure, for data a page can do without.
- `publicGetWithMeta(path, { tags? })` also gives `lastModified`, from the `Last-Modified` header.

Responses stay fresh for 60 seconds unless `options.revalidate` says otherwise. An empty `baseUrl`
throws. Each path starts with a single `/`, or the call throws. A path with a `.` or `..` segment,
encoded or not, gives null without a request, the same as a 404. Run a slug or other user input
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
`/builds/[slug]`, purges every page of that route. The target name is purged as a cache tag too, so
tag the fetches behind it with the same name. The handler answers 403 unless the caller has a live
session with `role`: signed in within the last seven days, with no refused refresh and an access
token that has not expired. It answers 415 unless the body is sent as JSON, which
`requestRevalidate` does, and 400 for a target it does not know.

```ts
// src/app/api/revalidate/route.ts
import { createRevalidateRoute } from "@sjolystinnovation/app-kit/server";

export const POST = createRevalidateRoute({
  role: "Admin",
  targets: { builds: ["/builds", "/builds/[slug]", "/sitemap.xml"], legal: ["/terms", "/privacy"] },
});
```

### `@sjolystinnovation/app-kit/session`

Decides when a user has to sign in again. Safe to import from server code, such as the next-auth
callbacks.

The gate reads `session.error`. `SessionExpiryGuard` also reads `session.absoluteExpiresAt` for its
countdown, `session.user.id` to keep the page with the user who opened it, and `session.user.email`
to fill in the prompt. `createAuthOptions` sets all of these. An app with its own next-auth options sets them in its
callbacks:

```ts
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

callbacks: {
  jwt({ token, user }) {
    if (user) token.loginAt = Date.now();
    // A token without a sign-in time counts as expired.
    if (!token.loginAt || Date.now() - token.loginAt > SESSION_LIFETIME_MS) {
      token.error = SESSION_ERRORS.absoluteExpiry;
    }
    // Also set token.error when a refresh is refused.
    return token;
  },
  session({ session, token }) {
    session.user.id = token.sub ?? "";
    session.error = token.error;
    session.absoluteExpiresAt = token.loginAt ? token.loginAt + SESSION_LIFETIME_MS : undefined;
    return session;
  },
},
```

For that to compile, these fields have to be on next-auth's `Session` and `JWT` types. Add them to
the app's existing next-auth type declarations, or create them:

```ts
// src/types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
    error?: string | undefined;
    absoluteExpiresAt?: number | undefined;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    error?: string | undefined;
    loginAt?: number | undefined;
  }
}
```

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
| `subscribeSessionPrompt(listener)` | Calls `listener` when the prompt opens or closes. Returns an unsubscribe function. |
| `getSessionPromptOpen()` | Whether the prompt is showing. |

Copies of the package installed side by side share the one flag, as long as their releases use the
same prompt state format. A release that changes the format says so in its changelog. An app's own
copy of these functions does not share the flag. So the interceptor, the prompt and every gate all
import them from this package.

### `useSessionGate()`

From `@sjolystinnovation/app-kit/session/react`. Tells a protected page whether it may render. It
reads `useSession`, so it needs a `SessionProvider` above it.

A page that rendered on a healthy session stays rendered, so an open form keeps its values:

- when the session gets a terminal error
- while the session is re-read
- while the prompt recovers it

A session that turns signed out with no prompt open blanks the page. A page the user opens on a
dead session does not render. Use `mayRender` in every gate and layout on the way down, so none of
them blanks a page that another one kept.

The hook does not navigate. `ProtectedGate` below adds the redirect. Use the hook directly in a
layout that needs its own decision, such as a role check, so it agrees with the gate.

| Field | Description |
| --- | --- |
| `mayRender` | Whether the page may render. |
| `session`, `status` | As `useSession` returns them. |
| `usable` | The session is signed in and has no terminal error. |
| `wasUsable` | This page has rendered on a usable session. |
| `promptOpen` | The re-sign-in prompt is showing. |
| `recovering` | The prompt is showing over a page that was usable. |

`SessionGate` is the type of the result.

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

From `@sjolystinnovation/app-kit/session/react`. Wraps the protected part of the app. It renders the
page only when `useSessionGate` allows it, and sends a signed-out visitor or a session dead on
arrival to `loginHref`. It never redirects while the re-sign-in prompt is open.

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
Place it inside `ProtectedGate`. While the re-sign-in prompt recovers a signed-out session there is
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

A sign-in in the prompt keeps the page and its form. A sign-in in the prompt as a different user is
signed out and sent to `loginHref`, so the prompt never hands the page to another user.

```tsx
<SessionExpiryGuard
  loginHref="/login"
  onRestored={() => toast.success("You are signed in again.")}
/>
```

| Prop | Type | Description |
| --- | --- | --- |
| `loginHref` | `string` | Where a sign-in as a different user is sent after it is signed out. |
| `onRestored` | `() => void` | Runs after the prompt signs the user back in, such as to show a toast. |
| `strings` | `TextOverrides<SessionExpiryGuardStrings>` | The guard's text. `{minutes}` in `expiringSoon` becomes the minutes left. The defaults are English. |
| `formStrings` | `TextOverrides<CredentialsFormStrings>` | The text of the form in the prompt. |

### `useFormDraft(config, options)`

From `@sjolystinnovation/app-kit/forms`. Keeps a form's values in `localStorage`, so a sign-out,
reload or closed tab does not lose them. Values are written half a second after the last change, so
only that last half second is at risk.

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
| `owner` | `string \| undefined` | The signed-in user's id. Drafts are stored per user, and nothing is stored until it is known. The last known owner is kept when the session stops reporting one. |
| `scope` | `string` | The form and the entity it edits, such as `recipe:42`. |
| `value` | `T` | The form's current values. They must survive `JSON.stringify`. |

Mount an edit form once the entity has loaded, with its values already in `value`. The hook treats
the values it first sees under a key as the untouched form, so values that arrive later count as an
edit and are written over the draft being offered.

It returns:

- `pending`, the stored draft. The page offers it to the user and does not apply it. It is read
  when the owner is first known and again whenever the owner or `scope` changes, so it can appear
  after the form mounts.
- `dismiss()`, to stop offering it.
- `clear()`, to drop the stored draft after a successful save.

Drafts are stored under `<draftStoragePrefix>:draft:<owner>:<scope>`. The hook throws when
`draftStoragePrefix` is empty or contains a colon. A draft older than 7 days is not offered, and is
removed when its form next reads it.

### `CredentialsForm`

From `@sjolystinnovation/app-kit/ui`. Email and password sign-in through next-auth's credentials
provider, with `redirect: false`, so the page stays where it is. Use it on the login page and in
the prompt.

```tsx
<CredentialsForm onSignedIn={() => router.push("/")} strings={{ signIn: "Logg inn" }} />
```

| Prop | Type | Description |
| --- | --- | --- |
| `onSignedIn` | `() => void \| Promise<void>` | Runs after next-auth accepts the credentials. Throw `SignInRejected` with a message to refuse the sign-in. |
| `initialEmail` | `string` | The email the field starts with. |
| `children` | `ReactNode` | Extra buttons next to the submit button. |
| `strings` | `TextOverrides<CredentialsFormStrings>` | The form's text. The defaults are English. |
| `onPendingChange` | `(pending: boolean) => void` | Runs when a sign-in starts and ends, such as to keep a dialog open until it finishes. |

A failed sign-in shows `signInUnavailable` for `SIGN_IN_ERRORS.unavailable` and
`invalidCredentials` for any other error code. A request next-auth refuses without an error code,
or one that throws, shows `somethingWentWrong`.

`TextOverrides<T>`, from `@sjolystinnovation/app-kit/ui`, is the type of every `strings` prop. Each
key is optional and may be `undefined`, and a missing or undefined key shows the English default.

### `TextInput`

From `@sjolystinnovation/app-kit/ui`. A labelled text field with the same look and props as
`PasswordInput`, apart from the show and hide toggle. It takes the other `<input>` attributes too.

```tsx
<TextInput label="Email" name="email" type="email" required error={errors.email} />
```

### `TextArea`

From `@sjolystinnovation/app-kit/ui`. A labelled multi-line field with the same look, label and
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
| `disabled` | `boolean` | Greys the switch out and ignores clicks. |
| `className` | `string` | Classes for placing it, on the outer element. |

An `onClick` that calls `event.preventDefault()` stops the change.

### `Alert`

```tsx
import { Alert } from "@sjolystinnovation/app-kit/ui";

<Alert variant="error">{message}</Alert>;
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant` | `"error" \| "success" \| "info" \| "warning"` | `"info"` | Colour of the box. |
| `role` | `"alert" \| "status" \| "none"` | `"alert"` | A screen reader announces `status` without interrupting, on every change of its text. Use `none` when a separate live region announces the text. |
| `className` | `string` | | Classes for placing the alert, such as a margin. Restyle it through the theme variables. A clashing class wins or loses by the order Tailwind emits them in. |
| `children` | `ReactNode` | | Content. |

### `PasswordInput`

A labelled password field with a button that shows and hides the value. It also takes the other
`<input>` attributes, apart from `type`, which the component switches itself. `className` goes on
the outer element, see below.

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
enforce through ASP.NET Identity: at least 8 characters, with a lowercase letter, an uppercase letter
and a digit. No symbol is needed. Identity counts only ASCII, so the letters are A to Z and the digits
0 to 9, and "Å" does not count as uppercase. Identity sets no upper limit. An app whose API does adds
it with `.max()`. A failing password gets one issue per rule it breaks, each with its message from
`strings`. Missing messages fall back to `defaultPasswordStrings`, which are English.

```ts
import { passwordSchema } from "@sjolystinnovation/app-kit/validation";

const result = passwordSchema({ uppercase: "Ta med en stor bokstav fra A til Z." }).safeParse(newPassword);
const gargeRule = passwordSchema().max(128, "Be at most 128 characters long.");
```

`PASSWORD_MIN_LENGTH` holds the minimum, for hint text.

## Theming

The components draw every colour, corner radius and label size from theme variables with a light
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

A default that points at another variable is read once for the whole page. The focus ring and the
primary button point at `--color-primary` and `--color-primary-foreground`. A scoped theme that
changes those also sets `--color-input-focus-ring`, `--color-button-primary-bg` and
`--color-button-primary-text` in the same selector.

An app that clears a whole Tailwind namespace, such as `--color-*: initial`, clears these variables
with it and has to set the ones it uses itself.

## Requirements

- Next.js 16, React 19, next-auth 4.24 or later and axios 1.20 or later, as peer dependencies the
  app installs itself.
- For `@sjolystinnovation/app-kit/validation`: zod 4, as an optional peer dependency.
- For `@sjolystinnovation/app-kit/toast`: sonner 2, as an optional peer dependency. Install a single
  copy, because two copies keep two separate toast stores.
- `jsonwebtoken` comes with the package. `@sjolystinnovation/app-kit/auth` uses it on the server.
- For `@sjolystinnovation/app-kit/ui` and the components in `session/react`: Tailwind CSS 4 and
  `@heroicons/react` 2. The focus ring and the primary button use the theme's `primary` and
  `primary-foreground` colours, unless their own variables are set.
- TypeScript with `"moduleResolution": "bundler"`. Relative imports here are extensionless, which
  `node16` and `nodenext` reject.

There is no build output. Bundlers strip or relocate `"use client"` directives, and shipping source
keeps them intact. The consumer compiles this source with its own `compilerOptions`, and
`skipLibCheck` does not exempt it.

## License

[Apache-2.0](./LICENSE) © Sjølyst Innovation AS
