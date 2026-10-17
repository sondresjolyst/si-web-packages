# si-web-packages

[![npm](https://img.shields.io/npm/v/@sjolystinnovation/app-kit.svg)](https://www.npmjs.com/package/@sjolystinnovation/app-kit)
[![CI](https://github.com/sondresjolyst/si-web-packages/actions/workflows/ci.yml/badge.svg)](https://github.com/sondresjolyst/si-web-packages/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/sondresjolyst/si-web-packages/blob/main/LICENSE)

> Shared building blocks for Next.js apps

This repository publishes the code that several Next.js apps on one ASP.NET Core API share: sign-in
and session handling, the API client, admin forms, page sections, SEO helpers, and the Next config.
An app installs the package and gets each fix from a version bump.

The package ships TypeScript source, and the consuming app compiles it. See the
[package README](https://github.com/sondresjolyst/si-web-packages/blob/main/packages/app-kit/README.md)
for the install steps and the API.

## Packages

| Package | Version | Description |
| --- | --- | --- |
| [`@sjolystinnovation/app-kit`](https://github.com/sondresjolyst/si-web-packages/tree/main/packages/app-kit) | [![npm](https://img.shields.io/npm/v/@sjolystinnovation/app-kit.svg)](https://www.npmjs.com/package/@sjolystinnovation/app-kit) | Building blocks for Next.js apps that sign in against a JWT API through next-auth |

## Contributing

Pull requests are welcome. See the
[contributing guide](https://github.com/sondresjolyst/si-web-packages/blob/main/CONTRIBUTING.md)
for the setup and the conventions.

## License

[Apache-2.0](https://github.com/sondresjolyst/si-web-packages/blob/main/LICENSE) © Sjølyst Innovation AS
