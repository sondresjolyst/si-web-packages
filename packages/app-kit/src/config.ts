/**
 * The values that differ between the apps using this package. Everything else in the session layer
 * is identical across them, so it stays hardcoded rather than becoming an option.
 */
export interface SessionConfig {
  /**
   * Name of the environment variable holding the API JWT secret, such as API_JWT_SECRET. Apps that
   * talk to more than one API, or that deploy several apps side by side, need distinct names.
   */
  jwtSecretEnvVar: string;
  /**
   * Where an expired or rejected session sends the browser. An app with a locale prefix uses
   * something like "/en/login", one without uses "/login".
   */
  loginRoute: string;
  /** Prefix for the localStorage keys holding form drafts. */
  draftStoragePrefix: string;
}

/** Identity helper, so an app can declare its config as a typed constant. */
export function defineSessionConfig(config: SessionConfig): SessionConfig {
  return config;
}

/**
 * Reads the API JWT secret named by the config. Throws rather than returning undefined, because a
 * missing secret silently breaks token verification at runtime instead of at boot.
 *
 * The caller passes the environment, usually `process.env`. Reading it here would put
 * `@types/node` in the type surface of a package that ends up in a browser bundle.
 */
export function resolveJwtSecret(
  config: SessionConfig,
  env: Record<string, string | undefined>,
): string {
  const secret = env[config.jwtSecretEnvVar];

  if (!secret) {
    throw new Error(
      `Missing ${config.jwtSecretEnvVar}. The app verifies API session tokens with it.`,
    );
  }

  return secret;
}
