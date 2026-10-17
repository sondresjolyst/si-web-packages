import axios from "axios";

/**
 * One field error of an ASP.NET validation problem. `message` is the API's text. `code` is the stable
 * code from the problem's `codes` extension, such as `invalidOrgNumber`, for showing the app's own
 * text. `limit` is the field's number from the `limits` extension, such as the most characters for
 * the code `tooLong`.
 */
export interface ApiFieldError {
  message: string;
  code?: string;
  limit?: number;
}

/**
 * Gets the per-field messages of an ASP.NET validation problem, keyed by the field's name in
 * camelCase so they match the form's own names: `{ errors: { OrgNumber: ["..."] } }` becomes
 * `{ orgNumber: ["..."] }`. Takes the failed axios call, the response body, or the `Error` that
 * `request` throws. Returns null when there are no field errors, so the caller falls back to one
 * message for the whole form.
 */
export function apiFieldErrors(error: unknown): Record<string, string[]> | null {
  const details = apiFieldErrorDetails(error);
  if (!details) return null;
  return Object.fromEntries(Object.entries(details).map(([field, list]) => [field, list.map(d => d.message)]));
}

/**
 * Gets the same field errors as `apiFieldErrors`, each with its code and limit when the problem has
 * the `codes` and `limits` extensions: `{ errors: { OrgNumber: ["..."] }, codes: { OrgNumber:
 * ["invalidOrgNumber"] } }` becomes `{ orgNumber: [{ message: "...", code: "invalidOrgNumber" }] }`.
 * A code lines up with the message at the same place in its field's list.
 */
export function apiFieldErrorDetails(error: unknown): Record<string, ApiFieldError[]> | null {
  // A Map, so a field named like an Object property such as "constructor" is still just a field.
  const fields = new Map<string, ApiFieldError[]>();
  for (const [key, list] of problemEntries(error)) {
    if (list.length === 0) continue;
    const field = key.charAt(0).toLowerCase() + key.slice(1);
    fields.set(field, [...(fields.get(field) ?? []), ...list]);
  }
  return fields.size > 0 ? Object.fromEntries(fields) : null;
}

type Entries = [string, ApiFieldError[]][];

/**
 * Reads the field errors as they come, from a problem body or from the `Error` that `request` throws.
 * Gives none for anything else.
 */
function problemEntries(error: unknown): Entries {
  const data = axios.isAxiosError(error) ? error.response?.data : error;
  if (data instanceof Error) {
    const kept = data as { fieldErrorDetails?: unknown; fieldErrors?: unknown };
    if (isRecord(kept.fieldErrorDetails)) return keptEntries(kept.fieldErrorDetails);
    return isRecord(kept.fieldErrors) ? bodyEntries(kept.fieldErrors, {}, {}) : [];
  }
  if (!isRecord(data) || !isRecord(data.errors)) return [];
  return bodyEntries(data.errors, isRecord(data.codes) ? data.codes : {}, isRecord(data.limits) ? data.limits : {});
}

function bodyEntries(errors: Record<string, unknown>, codes: Record<string, unknown>, limits: Record<string, unknown>): Entries {
  return Object.entries(errors).map(([key, value]) => {
    // A key named like an Object property reads something that is not text or a number, which toError drops.
    const fieldCodes = codes[key];
    const codeList = Array.isArray(fieldCodes) ? fieldCodes : [fieldCodes];
    const limit = limits[key];
    const messages = Array.isArray(value) ? value : [value];
    return [key, messages.flatMap((message, i) => toError({ message, code: codeList[i], limit }))];
  });
}

function keptEntries(details: Record<string, unknown>): Entries {
  return Object.entries(details).map(([key, value]) => [
    key,
    (Array.isArray(value) ? value : []).flatMap(item => (isRecord(item) ? toError(item) : [])),
  ]);
}

/** Keeps a non-empty text message, with its code and limit only when they have the right types. */
function toError({ message, code, limit }: Record<string, unknown>): ApiFieldError[] {
  if (typeof message !== "string" || message === "") return [];
  return [
    {
      message,
      ...(typeof code === "string" && code !== "" ? { code } : {}),
      ...(typeof limit === "number" && Number.isFinite(limit) ? { limit } : {}),
    },
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
