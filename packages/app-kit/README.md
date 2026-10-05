# @sjolystinnovation/app-kit

[![npm](https://img.shields.io/npm/v/@sjolystinnovation/app-kit.svg)](https://www.npmjs.com/package/@sjolystinnovation/app-kit)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)

> Session configuration for Next.js apps that sign in against a JWT API through next-auth

Several apps sharing one API also share the session plumbing around it: which environment variable
holds the signing secret, where an expired session sends the browser, what prefixes the draft keys in
`localStorage`. This package keeps those as one typed config, so the code around them can be shared
instead of copied.

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

## Requirements

- Next.js 16, React 19, next-auth 4 and axios 1, as peer dependencies the app installs itself.
- TypeScript with `"moduleResolution": "bundler"`. Relative imports here are extensionless, which
  `node16` and `nodenext` reject.

There is no build output. Shipping source is what keeps the `"use client"` directives intact, since
bundlers strip or relocate them. The consumer therefore compiles this source with its own
`compilerOptions`, and `skipLibCheck` does not exempt it.

## License

[Apache-2.0](./LICENSE) © Sjølyst Innovation AS
