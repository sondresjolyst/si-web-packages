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
  const code = data instanceof Error ? (data as { errorCode?: unknown }).errorCode : bodyField(data, "code");
  return text(code);
}

/**
 * Gets the document of a `termsChanged` conflict from SjolystInnovation.AppKit.Auth, such as
 * `privacy` from `{ "message": "...", "code": "termsChanged", "document": "privacy" }`, so the app can
 * show that document again. Takes the failed axios call, the response body, or the `Error` that
 * `request` throws. Returns undefined for any other failure, and for a conflict about the terms
 * themselves, which has no `document`.
 */
export function termsChangedDocument(error: unknown): string | undefined {
  const data = failureBody(error);
  if (data instanceof Error) {
    const kept = data as { errorCode?: unknown; errorDocument?: unknown };
    return kept.errorCode === "termsChanged" ? text(kept.errorDocument) : undefined;
  }
  return bodyField(data, "code") === "termsChanged" ? text(bodyField(data, "document")) : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/** Reads one field from a JSON body, also when axios left the body as text. */
function bodyField(data: unknown, name: "code" | "document"): unknown {
  let body = data;
  if (typeof data === "string") {
    try {
      body = JSON.parse(data);
    } catch {
      return undefined;
    }
  }
  // A text, number or list has no field of its own, so only a JSON object gives one.
  return (body as Record<string, unknown> | null | undefined)?.[name];
}
