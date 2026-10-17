/**
 * The response body of a failed axios call, or the value itself when it is not one. It checks the
 * axios flag like `axios.isAxiosError` does, without importing axios, so the `ui` entry can read a
 * failure's codes while axios stays an optional peer.
 */
export function failureBody(error: unknown): unknown {
  if (!error || typeof error !== "object") return error;
  const failed = error as { isAxiosError?: unknown; response?: { data?: unknown } };
  return failed.isAxiosError === true ? failed.response?.data : error;
}
