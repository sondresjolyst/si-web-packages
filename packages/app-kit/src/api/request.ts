import axios from "axios";
import { formatApiError, type StatusMessages } from "../errors";

/**
 * Runs an API call and returns its data. A failure throws an `Error` with a message for the user,
 * from `formatApiError`. A cancelled call rethrows the cancel as it is, so the caller can ignore it.
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
    // eslint-disable-next-line preserve-caught-error
    throw new Error(formatApiError(error, fallback, statusMessages));
  }
}
