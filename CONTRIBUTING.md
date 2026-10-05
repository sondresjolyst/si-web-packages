# Contributing

Thanks for taking a look. Bug reports, questions and pull requests are all welcome. For anything
bigger than a small fix, open an issue first so we can agree on the shape before you spend time on
it.

## Getting set up

```sh
pnpm install
```

pnpm is pinned by the `packageManager` field in `package.json`, so you do not need to pick a version.
CI runs Node 26.

## Running the checks

```sh
pnpm lint
pnpm typecheck
pnpm test
```

CI runs the same three on every pull request, so running them first saves you a round trip.

## Good to know before you change the source

The packages here have no build step. `exports` points straight at `src`, so what gets published is
TypeScript, and each consuming app compiles it through `transpilePackages`. The reason is the
`"use client"` directive: bundlers strip it or move it, and the app breaks at runtime rather than at
build time.

A few things follow from that, and they are easy to trip over:

- `react`, `react-dom`, `next`, `next-auth` and `axios` are peer dependencies, kept at major ranges.
  A second copy of React breaks hooks, and axios interceptors need the app's own instance.
- Relative imports stay extensionless, which means consumers need `"moduleResolution": "bundler"`.
- Consumers typecheck this source with their own `compilerOptions`, so it has to hold up under
  settings stricter than the ones in this repository. `skipLibCheck` will not save you.
- `"use client"` belongs in each component and hook file rather than in an entry point's
  `index.ts`. On a barrel it makes every export of that entry a client reference, and server code
  importing one gets a proxy instead of a function.

TypeScript is held at `^6` on purpose. typescript-eslint throws on TypeScript 7, which ships no
JavaScript compiler API for it to use, so a bump breaks linting entirely.

## Adding an entry point

Add the entry point in the same change as the code behind it, so the published package never
advertises an import that exports nothing.

1. New directory under `packages/app-kit/src`.
2. New line in `exports` in `packages/app-kit/package.json`.
3. A row in `packages/app-kit/README.md`.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/), scoped with the entry point:

```
fix(session): evict every refresh token past the cap
```

release-please reads them to work out the next version and to write the changelog, so the type and
the scope end up in the release notes. A body is worth adding when the title and the diff leave
something out, such as a new environment variable.

## Pull requests

Branch from `main`, keep the description to a sentence or two, and make sure CI is green.

## Releases

Maintainers handle these. Merging to `main` opens a release pull request, and merging that tags the
release and publishes to npm through OIDC
[trusted publishing](https://docs.npmjs.com/trusted-publishers), so no npm token is stored here.
