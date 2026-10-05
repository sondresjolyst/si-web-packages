# AGENTS.md

pnpm workspace publishing `@sjolystinnovation/app-kit` to npm.

Read [CONTRIBUTING.md](CONTRIBUTING.md) first. It covers the setup, the checks, why there is no build
step, and the commit conventions.

## Verify before reporting work as done

```sh
pnpm lint
pnpm typecheck
pnpm test
```

## Never

- Never add `react`, `react-dom`, `next`, `next-auth` or `axios` to `dependencies`. Peer
  dependencies only, at major ranges.
- Never add a build step. `exports` points at `src`.
- Never put `"use client"` in an entry point barrel. Put it in each component and hook file.
- Never add an entry point to `exports` before there is code behind it.
- Never split this into more published packages.
- Never bump TypeScript past `^6`.
- Never commit, push or open a pull request unless asked.

## Writing

English prose in comments, commit messages and documentation. No em dashes and no semicolons in
prose. Commit and pull request bodies stay short: a line for what the title and the diff do not show,
nothing about test counts or build status, since CI reports those.
