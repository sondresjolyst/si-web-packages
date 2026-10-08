/**
 * The values that differ between the apps using this package. Everything else in the session layer
 * is the same in every app, so it is hardcoded.
 */
export interface SessionConfig {
  /**
   * Name of the environment variable holding the API JWT secret, such as API_JWT_SECRET. Apps that
   * talk to more than one API, or that deploy several apps side by side, need distinct names.
   */
  jwtSecretEnvVar: string;
  /**
   * Where an expired or rejected session sends the browser. An app with a locale prefix uses
   * something like "/en/login". An app without one uses "/login".
   */
  loginRoute: string;
  /**
   * Prefix for the localStorage keys holding form drafts, usually the app's name, such as
   * "example". Drafts are stored under `<prefix>:draft:<owner>:<scope>`, so the prefix itself
   * has no trailing colon.
   */
  draftStoragePrefix: string;
}

/**
 * Declares an app's config as a typed constant. Throws when `draftStoragePrefix` is not a bare name,
 * so a bad value fails at app start, before any form opens.
 */
export function defineSessionConfig(config: SessionConfig): SessionConfig {
  draftPrefix(config);
  return config;
}

/**
 * The key prefix for form drafts. Throws on a colon or an empty name. Those build keys such as
 * "app:draft::draft:", which match no draft saved under "app:draft:".
 */
export function draftPrefix(config: Pick<SessionConfig, "draftStoragePrefix">): string {
  const name = config.draftStoragePrefix;
  if (!name || name.includes(":")) {
    throw new Error(`draftStoragePrefix must be a bare name such as "example", not "${name}".`);
  }
  return `${name}:draft:`;
}

/**
 * Returns `value`, or throws when it is unset or empty. Pass `process.env.NAME` directly, so Next.js
 * can inline public variables at build time.
 */
export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

/**
 * Reads the API JWT secret named by the config. Throws when it is missing, with a message that names
 * the variable.
 *
 * The caller passes the environment, usually `process.env`, so this entry point needs no Node
 * types and stays safe to import in browser code.
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
