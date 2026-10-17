import { failureBody } from "./failureBody";

/**
 * Gets the stable code of a failure that is not about one field, such as `lockedOut` or
 * `invalidResetCode` from `{ "message": "...", "code": "invalidResetCode" }`, for showing the app's
 * own text. Takes the failed axios call, the response body, or the `Error` that `request` throws.
 * Returns undefined when the failure has no code, so the caller shows the API's message.
 */
export function apiErrorCode(error: unknown): string | undefined {
  const data = failureBody(error);
  // An axios error is read through its body above. Its own `code`, such as ERR_NETWORK, is not the API's.
  const code = data instanceof Error ? (data as { errorCode?: unknown }).errorCode : bodyCode(data);
  return typeof code === "string" && code !== "" ? code : undefined;
}

/** Reads `code` from a JSON body, also when axios left the body as text. */
function bodyCode(data: unknown): unknown {
  let body = data;
  if (typeof data === "string") {
    try {
      body = JSON.parse(data);
    } catch {
      return undefined;
    }
  }
  // A text, number or list has no `code` of its own, so only a JSON object gives one.
  return (body as { code?: unknown } | null | undefined)?.code;
}
