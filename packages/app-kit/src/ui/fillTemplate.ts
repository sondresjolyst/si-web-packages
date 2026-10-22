/**
 * Fills each `{name}` in `text` from `values`, for the dictionary strings that name a value such as
 * a user or a count. A placeholder with no value stays as it is. A value with `$` in it is inserted
 * as typed.
 */
export function fillTemplate(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => (Object.hasOwn(values, name) ? String(values[name]) : placeholder));
}
