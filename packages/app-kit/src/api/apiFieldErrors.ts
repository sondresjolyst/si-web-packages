import axios from "axios";

/**
 * Gets the per-field messages of an ASP.NET validation problem, keyed by the field's name in
 * camelCase so they match the form's own names: `{ errors: { OrgNumber: ["..."] } }` becomes
 * `{ orgNumber: ["..."] }`. Takes the failed axios call or the response body. Returns null when
 * there are no field errors, so the caller falls back to one message for the whole form.
 */
export function apiFieldErrors(error: unknown): Record<string, string[]> | null {
  const data = axios.isAxiosError(error) ? error.response?.data : error;
  const errors = data && typeof data === "object" ? (data as { errors?: unknown }).errors : undefined;
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return null;

  // A Map, so a field named like an Object property such as "constructor" is still just a field.
  const fields = new Map<string, string[]>();
  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    const messages = (Array.isArray(value) ? value : [value]).filter((m): m is string => typeof m === "string" && m !== "");
    if (messages.length === 0) continue;
    const field = key.charAt(0).toLowerCase() + key.slice(1);
    fields.set(field, [...(fields.get(field) ?? []), ...messages]);
  }
  return fields.size > 0 ? Object.fromEntries(fields) : null;
}
