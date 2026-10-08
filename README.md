# si-web-packages

[![npm](https://img.shields.io/npm/v/@sjolystinnovation/app-kit.svg)](https://www.npmjs.com/package/@sjolystinnovation/app-kit)
[![CI](https://github.com/sondresjolyst/si-web-packages/actions/workflows/ci.yml/badge.svg)](https://github.com/sondresjolyst/si-web-packages/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

> Shared building blocks for Next.js apps

These packages hold the session handling that several Next.js apps share. An app installs a
package and gets each fix from a version bump.

The packages ship TypeScript source, and the consuming app compiles them. That keeps the
`"use client"` directives intact. See the package README for what that means for a consumer.

## Packages

| Package | Version | Description |
| --- | --- | --- |
| [`@sjolystinnovation/app-kit`](packages/app-kit) | [![npm](https://img.shields.io/npm/v/@sjolystinnovation/app-kit.svg)](https://www.npmjs.com/package/@sjolystinnovation/app-kit) | next-auth sign-in, an API client, session and form building blocks for apps on a JWT API |

## Contributing

Pull requests are welcome. See the [contributing guide](CONTRIBUTING.md) for the setup and the
conventions.

## License

[Apache-2.0](LICENSE) © Sjølyst Innovation AS
