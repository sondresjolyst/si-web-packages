import axios, { type AxiosResponse } from "axios";

/**
 * Messages to show for a status code when the response carries none of its own. Key 0 covers a
 * request that got no response at all, such as a timeout or a dropped connection.
 */
export type StatusMessages = Partial<Record<number, string>>;

/**
 * Turns a failed request into one line a user can read. For an axios error that is the first of: a
 * single line text body on a 4xx response, `message`, the first validation error, `detail` and
 * `title` from a JSON body, then `statusMessages` for the response status, then `fallback`. Axios's
 * own message, such as "Request failed with status code 500", is never shown. Any other `Error`
 * gives its message.
 */
export function formatApiError(
  error: unknown,
  fallback: string,
  statusMessages: StatusMessages = {},
): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    return messageFromBody(error.response) ?? statusMessages[status] ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function messageFromBody(response: AxiosResponse | undefined): string | undefined {
  if (!response) return undefined;
  const data: unknown = response.data;

  if (typeof data === "string") return textMessage(data, response.status);
  if (!data || typeof data !== "object") return undefined;

  const body = data as Record<string, unknown>;
  if (isText(body.message)) return body.message;
  const firstError = firstValidationError(body.errors);
  if (firstError) return firstError;
  if (isText(body.detail)) return body.detail;
  if (isText(body.title)) return body.title;
  return undefined;
}

/**
 * A text body is the API's own message, such as `BadRequest("...")`, only on a 4xx response. On a
 * 5xx it is a proxy's "Bad Gateway" or a server's stack trace, and anything spanning lines or
 * written as HTML is not a message either.
 */
function textMessage(data: string, status: number): string | undefined {
  const text = data.trim();
  if (status < 400 || status >= 500) return undefined;
  if (!text || text.includes("\n") || text.startsWith("<")) return undefined;
  return text;
}

/** Reads the first message from `errors`, whether its values are string arrays or strings. */
function firstValidationError(errors: unknown): string | undefined {
  if (!errors || typeof errors !== "object") return undefined;
  for (const value of Object.values(errors)) {
    if (isText(value)) return value;
    if (Array.isArray(value) && isText(value[0])) return value[0];
  }
  return undefined;
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}
