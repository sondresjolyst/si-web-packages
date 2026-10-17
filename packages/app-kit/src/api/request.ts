import axios from "axios";
import { apiFieldErrors } from "./apiFieldErrors";
import { formatApiError, type StatusMessages } from "./formatApiError";

/**
 * Runs an API call and returns its data. A failure throws an `Error` with a message for the user,
 * from `formatApiError`. When the API answers with a validation problem, the error also carries its
 * per-field messages, which `apiFieldErrors` reads. A canceled call rethrows the cancel as it is, so
 * the caller can ignore it.
 */
export async function request<T>(
  call: () => Promise<{ data: T }>,
  fallback: string,
  statusMessages?: StatusMessages,
): Promise<T> {
  try {
    const response = await call();
    return response.data;
  } catch (error: unknown) {
    if (axios.isCancel(error)) throw error;
    // No cause. Errors get logged, and the axios error carries the access token and request body.
    const failure = new Error(formatApiError(error, fallback, statusMessages));
    // Only the field messages, never the response, for the same reason.
    const fieldErrors = apiFieldErrors(error);
    if (fieldErrors) Object.assign(failure, { fieldErrors });
    throw failure;
  }
}
