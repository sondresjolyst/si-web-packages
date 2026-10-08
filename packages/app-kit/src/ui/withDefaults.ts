/** Text overrides where any key may be missing or undefined. */
export type TextOverrides<T> = { [K in keyof T]?: T[K] | undefined };

/**
 * Fills in defaults for any string that is missing or undefined, so a key missing from an app's
 * dictionary still shows the default text.
 */
export function withDefaults<T extends object>(defaults: T, overrides: TextOverrides<T> | undefined): T {
  const result = { ...defaults };
  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (value !== undefined) (result as Record<string, unknown>)[key] = value;
  }
  return result;
}
