# @sjolystinnovation/app-kit

[![npm](https://img.shields.io/npm/v/@sjolystinnovation/app-kit.svg)](https://www.npmjs.com/package/@sjolystinnovation/app-kit)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

> Building blocks for Next.js apps that sign in against a JWT API through next-auth

Several apps sharing one API also share the code around it: the session plumbing, how a failed
request becomes a message a user can read, and the form controls on the sign in page. This package
holds that code once, so the apps install it instead of each keeping a copy.

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

The components in `@sjolystinnovation/app-kit/ui` are styled with Tailwind CSS. Tailwind skips
`node_modules` when it scans for class names, so point it at the package from the stylesheet that
imports Tailwind, with the path relative to that file:

```css
/* src/app/globals.css */
@import "tailwindcss";
@source "../../node_modules/@sjolystinnovation/app-kit/src";
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
| `draftStoragePrefix` | `string` | Prefix for the `localStorage` keys holding form drafts. |

### `defineSessionConfig(config)`

`(config: SessionConfig) => SessionConfig`

Returns the config unchanged, so TypeScript checks its shape where it is declared rather than at
every call site.

### `resolveJwtSecret(config, env)`

`(config: SessionConfig, env: Record<string, string | undefined>) => string`

Reads the secret named by `config.jwtSecretEnvVar`. Throws when that variable is unset or empty, so a
missing secret fails at startup instead of at the first token verification.

```ts
resolveJwtSecret(sessionConfig, { API_JWT_SECRET: "s3cret" });
// "s3cret"

resolveJwtSecret(sessionConfig, {});
// Error: Missing API_JWT_SECRET. The app verifies API session tokens with it.
```

The environment is a parameter rather than a read of `process.env`, which keeps Node types out of a
package that also runs in the browser.

### `formatApiError(error, fallback)`

`(error: unknown, fallback: string) => string`

Turns a failed request into one line a user can read. For an axios error it takes the first of
`message`, the first validation error, `detail` and `title` from the response body, which covers
plain JSON errors and ASP.NET Core problem details alike. Otherwise it uses the error's own message,
then `fallback`.

```ts
try {
  await api.post("/users", form);
} catch (error) {
  setError(formatApiError(error, "Could not create the user."));
}
```

### `Alert`

```tsx
import { Alert } from "@sjolystinnovation/app-kit/ui";

<Alert variant="error">{message}</Alert>;
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `variant` | `"error" \| "success" \| "info" \| "warning"` | `"info"` | Colour of the box. |
| `role` | `"alert" \| "status"` | `"alert"` | Use `status` for text that keeps changing, such as a countdown, so a screen reader does not announce every change. |
| `children` | `ReactNode` | | Content. |

### `PasswordInput`

A labelled password field with a button that shows and hides the value. Accepts every `<input>`
attribute as well.

```tsx
import { PasswordInput } from "@sjolystinnovation/app-kit/ui";

<PasswordInput label="Password" name="password" required error={errors.password} />;
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `string` | | Visible label, tied to the input. |
| `error` | `string` | | Message shown under the field, which also turns the border red. |
| `showPasswordLabel` | `string` | `"Show password"` | Accessible name of the toggle while the value is hidden. |
| `hidePasswordLabel` | `string` | `"Hide password"` | Accessible name of the toggle while the value is visible. |

Pass the two toggle labels in the app's language. The defaults are English.

## Requirements

- Next.js 16, React 19, next-auth 4 and axios 1, as peer dependencies the app installs itself.
- For `@sjolystinnovation/app-kit/ui`: Tailwind CSS 4 with a `primary` colour in the theme, which the
  focus ring uses, and `@heroicons/react` 2.
- TypeScript with `"moduleResolution": "bundler"`. Relative imports here are extensionless, which
  `node16` and `nodenext` reject.

There is no build output. Shipping source is what keeps the `"use client"` directives intact, since
bundlers strip or relocate them. The consumer therefore compiles this source with its own
`compilerOptions`, and `skipLibCheck` does not exempt it.

## License

[Apache-2.0](./LICENSE) © Sjølyst Innovation AS
