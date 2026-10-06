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
 * validation error and `detail` from a JSON body. After that come `statusMessages` for the status,
 * the JSON `title` and `fallback`. On a 5xx the caller's status message comes first, because the
 * body may be a proxy's "Bad Gateway" rather than the API's own words.
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
    const body = readBody(response);
    const forStatus = statusMessages[response.status];
    if (response.status >= 500) return forStatus ?? body.specific ?? body.title ?? fallback;
    return body.specific ?? forStatus ?? body.title ?? fallback;
  }
  if (error instanceof Error) return singleLine(error.message) ?? fallback;
  return fallback;
}

interface BodyMessages {
  /** A message written for this failure. */
  specific?: string;
  /**
   * A problem details title. ASP.NET Core sends a generic one, such as "Conflict", for every bare
   * status result, so it ranks below the caller's status messages.
   */
  title?: string;
}

function readBody(response: AxiosResponse): BodyMessages {
  const data: unknown = response.data;
  if (typeof data === "string") return { specific: singleLine(data) };
  if (!data || typeof data !== "object") return {};

  const body = data as Record<string, unknown>;
  return {
    specific: singleLine(body.message) ?? firstValidationError(body.errors) ?? singleLine(body.detail),
    title: singleLine(body.title),
  };
}

/** Reads the first message from `errors`, whether its values are string arrays or strings. */
function firstValidationError(errors: unknown): string | undefined {
  if (!errors || typeof errors !== "object") return undefined;
  for (const value of Object.values(errors)) {
    const message = singleLine(Array.isArray(value) ? value[0] : value);
    if (message) return message;
  }
  return undefined;
}

/** The trimmed text, when it is one line of text and not HTML. */
function singleLine(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text || text.includes("\n") || text.startsWith("<")) return undefined;
  return text;
}
