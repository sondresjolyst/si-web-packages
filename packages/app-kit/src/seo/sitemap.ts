/** The latest of a set of timestamps, or undefined when there are none. */
export function latest(dates: readonly (Date | undefined)[]): Date | undefined {
  const known = dates.filter((date): date is Date => date != null);
  if (known.length === 0) return undefined;
  return known.reduce((newest, date) => (date > newest ? date : newest));
}

/** Parses an API timestamp. A missing or malformed value gives undefined. */
export function parseTimestamp(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
