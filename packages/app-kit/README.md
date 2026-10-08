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

The components in `@sjolystinnovation/app-kit/ui` are styled with Tailwind CSS. Import the
package's stylesheet after Tailwind:

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

### `@sjolystinnovation/app-kit/session`

Decides when a user has to sign in again. Safe to import from server code, such as the next-auth
callbacks.

The gate reads `session.error`. `createAuthOptions` sets it already. An app with its own next-auth
options sets `token.error` in its `jwt` callback and copies it across in its `session` callback:

```ts
callbacks: {
  session({ session, token }) {
    session.error = token.error;
    return session;
  },
},
```

For that to compile, `error` has to be on next-auth's `Session` and `JWT` types. Add it to
the app's existing next-auth type declarations, or create them:

```ts
// src/types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    error?: string | undefined;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    error?: string | undefined;
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

The hook does not navigate. The gate sends the user to the login page itself, and never while the
prompt is open. The app passes the login URL in, so an app with a locale in the path can build it
for the current locale:

```tsx
"use client";

import { useSessionGate } from "@sjolystinnovation/app-kit/session/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProtectedGate({
  loginHref,
  children,
}: {
  loginHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { status, promptOpen, usable, wasUsable, mayRender } = useSessionGate();

  useEffect(() => {
    if (promptOpen) return;
    if (status === "unauthenticated" || (status === "authenticated" && !usable && !wasUsable)) {
      router.push(loginHref);
    }
  }, [status, usable, wasUsable, promptOpen, router, loginHref]);

  return mayRender ? children : <p>Loading…</p>;
}
```

| Field | Description |
| --- | --- |
| `mayRender` | Whether the page may render. |
| `session`, `status` | As `useSession` returns them. |
| `usable` | The session is signed in and has no terminal error. |
| `wasUsable` | This page has rendered on a usable session. |
| `promptOpen` | The re-sign-in prompt is showing. |
| `recovering` | The prompt is showing over a page that was usable. |

`SessionGate` is the type of the result.

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

### `Alert`

```tsx
import { Alert } from "@sjolystinnovation/app-kit/ui";

<Alert variant="error">{message}</Alert>;
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant` | `"error" \| "success" \| "info" \| "warning"` | `"info"` | Colour of the box. |
| `role` | `"alert" \| "status"` | `"alert"` | Use `status` for text that keeps changing, such as a countdown, so a screen reader does not announce every change. |
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

A default that points at another variable, such as `--color-input-focus-ring` at `--color-primary`,
is read once for the whole page. A scoped theme that changes `--color-primary` should set
`--color-input-focus-ring` in the same selector.

An app that clears a whole Tailwind namespace, such as `--color-*: initial`, clears these variables
with it and has to set the ones it uses itself.

## Requirements

- Next.js 16, React 19, next-auth 4.24 or later and axios 1.20 or later, as peer dependencies the
  app installs itself.
- `jsonwebtoken` comes with the package. `@sjolystinnovation/app-kit/auth` uses it on the server.
- For `@sjolystinnovation/app-kit/ui`: Tailwind CSS 4 and `@heroicons/react` 2. The focus ring uses
  the theme's `primary` colour unless `--color-input-focus-ring` is set.
- TypeScript with `"moduleResolution": "bundler"`. Relative imports here are extensionless, which
  `node16` and `nodenext` reject.

There is no build output. Bundlers strip or relocate `"use client"` directives, and shipping source
keeps them intact. The consumer compiles this source with its own `compilerOptions`, and
`skipLibCheck` does not exempt it.

## License

[Apache-2.0](./LICENSE) © Sjølyst Innovation AS
