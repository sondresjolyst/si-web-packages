# si-web-packages

[![npm](https://img.shields.io/npm/v/@sjolystinnovation/app-kit.svg)](https://www.npmjs.com/package/@sjolystinnovation/app-kit)
[![CI](https://github.com/sondresjolyst/si-web-packages/actions/workflows/ci.yml/badge.svg)](https://github.com/sondresjolyst/si-web-packages/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

> Shared building blocks for Next.js apps

Several Next.js apps ended up carrying the same session handling, copied file by file. One fix to
session expiry then needed porting by hand into every copy, and the copies had already drifted apart
by the time anyone noticed. The packages here are that layer, published so an app installs it and
gets the next fix from a version bump.

The packages ship TypeScript source and the consuming app compiles them, which is what keeps the
`"use client"` directives intact. See the package README for what that means for a consumer.

## Packages

| Package | Version | Description |
| --- | --- | --- |
| [`@sjolystinnovation/app-kit`](packages/app-kit) | [![npm](https://img.shields.io/npm/v/@sjolystinnovation/app-kit.svg)](https://www.npmjs.com/package/@sjolystinnovation/app-kit) | Session, error handling and form building blocks for next-auth against a JWT API |

## Contributing

Pull requests are welcome. See the [contributing guide](CONTRIBUTING.md) for the setup and the
conventions.

## License

[Apache-2.0](LICENSE) © Sjølyst Innovation AS
