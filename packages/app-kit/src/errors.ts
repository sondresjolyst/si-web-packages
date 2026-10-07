import axios, { type AxiosResponse } from "axios";

/**
 * Messages to show for a status code. On a 4xx they are used when the response carries no specific
 * message of its own. On a 5xx they win over the body. Key 0 covers a request that got no response,
 * because of a dropped connection or a timeout.
 */
export type StatusMessages = Partial<Record<number, string>>;

/**
 * Axios codes for a request that never got a response from the network. A browser reports every
 * network failure as ERR_NETWORK. On the server, Node reports the cause instead.
 */
const NO_RESPONSE_CODES = new Set([
  "ERR_NETWORK",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);

/**
 * Turns a failed request into one line a user can read.
 *
 * On a 4xx response the body's own message comes first: a text body, then `message`, the first
 * validation error and `detail` from a JSON body. After that come `statusMessages` for the status
 * and `fallback`. On a 5xx the caller's status message comes first, because the body may be a
 * proxy's "Bad Gateway" rather than the API's own words. A problem details `title` is never used:
 * ASP.NET Core fills it with generic text such as "Bad Request", which says less than `fallback`.
 *
 * Only single line text counts as a message. Axios's own message, such as "Request failed with
 * status code 500", is never shown, and a cancelled request gives `fallback`. Any other `Error`
 * gives its message.
 */
export function formatApiError(
  error: unknown,
  fallback: string,
  statusMessages: StatusMessages = {},
): string {
  if (axios.isCancel(error)) return fallback;
  if (axios.isAxiosError(error)) {
    const response = error.response;
    if (!response) {
      return NO_RESPONSE_CODES.has(error.code ?? "") ? (statusMessages[0] ?? fallback) : fallback;
    }
    const message = readBody(response);
    const forStatus = statusMessages[response.status];
    if (response.status >= 500) return forStatus ?? message ?? fallback;
    return message ?? forStatus ?? fallback;
  }
  if (error instanceof Error) return singleLine(error.message) ?? fallback;
  return fallback;
}

/** The message the body carries for this failure, if it carries one. */
function readBody(response: AxiosResponse): string | undefined {
  const data = parseIfJson(response.data);
  if (typeof data === "string") return singleLine(data);
  // Only a parsed JSON object has fields to read. A Document, Blob or ArrayBuffer does not.
  if (!isPlainObject(data)) return undefined;
  return firstText(data.message) ?? firstValidationError(data.errors) ?? singleLine(data.detail);
}

/**
 * Axios leaves a JSON body as a string when the request asked for text, so parse it here. Plain text
 * such as "Invalid email or password." is not valid JSON and stays as it is.
 */
function parseIfJson(data: unknown): unknown {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Reads the first message from `errors`, whether its values are string arrays or strings. */
function firstValidationError(errors: unknown): string | undefined {
  if (!errors || typeof errors !== "object") return undefined;
  for (const value of Object.values(errors)) {
    const message = firstText(value);
    if (message) return message;
  }
  return undefined;
}

/** A single line of text, or the first entry when the value is a list of them. */
function firstText(value: unknown): string | undefined {
  return singleLine(Array.isArray(value) ? value[0] : value);
}

/** The trimmed text, when it is one line of text and not HTML. */
function singleLine(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text || /[\r\n\u2028\u2029]/.test(text) || text.startsWith("<")) return undefined;
  return text;
}
