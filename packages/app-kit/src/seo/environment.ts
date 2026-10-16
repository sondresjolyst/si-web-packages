/** The values of `SITE_ENV` that name the live site. The deploy workflows pass `prod`. */
const PRODUCTION = new Set(["production", "prod", ""]);

/**
 * Checks whether this deployment is the one search engines should index. An unset `SITE_ENV` counts
 * as production, so a missing variable is never what deindexes the live site.
 */
export function isIndexableEnvironment(siteEnv: string | undefined = process.env.SITE_ENV): boolean {
  return PRODUCTION.has(siteEnv?.trim().toLowerCase() ?? "");
}
