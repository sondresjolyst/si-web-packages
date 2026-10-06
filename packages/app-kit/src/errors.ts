import axios, { type AxiosResponse } from "axios";

/**
 * Messages to show for a status code when the response carries no specific message of its own. Key 0
 * covers a request that got no response at all, such as a timeout or a dropped connection.
 */
export type StatusMessages = Partial<Record<number, string>>;

/**
 * Turns a failed request into one line a user can read. For an axios error that is the first of: a
 * text body on a 4xx response, then `message`, the first validation error and `detail` from a JSON
 * body, then `statusMessages` for the status, then the JSON `title`, then `fallback`. Only single
 * line text counts as a message. Axios's own message, such as "Request failed with status code
 * 500", is never shown, and a cancelled request gives `fallback`. Any other `Error` gives its message.
 */
export function formatApiError(
  error: unknown,
  fallback: string,
  statusMessages: StatusMessages = {},
): string {
  if (axios.isCancel(error)) return fallback;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const body = readBody(error.response);
    return body.specific ?? statusMessages[status] ?? body.title ?? fallback;
  }
  if (error instanceof Error) return error.message;
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

function readBody(response: AxiosResponse | undefined): BodyMessages {
  if (!response) return {};
  const data: unknown = response.data;

  if (typeof data === "string") {
    // On a 4xx a text body is the API's own message, such as BadRequest("..."). On a 5xx it is a
    // proxy's "Bad Gateway" or a server's stack trace.
    const status = response.status;
    return status >= 400 && status < 500 ? { specific: singleLine(data) } : {};
  }
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
