import axios from "axios";

interface ApiErrorBody {
  message?: string;
  detail?: string;
  title?: string;
  errors?: Record<string, string[]>;
}

/**
 * Turns a failed request into one line a user can read. Takes the first of `message`, the first
 * validation error, `detail` and `title` from the response body, so it reads both plain JSON
 * errors and ASP.NET Core problem details. Falls back to the error's own message, then to
 * `fallback`.
 */
export function formatApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorBody | undefined;
    if (data?.message) return data.message;
    if (data?.errors) {
      const first = Object.values(data.errors)[0];
      if (first && first.length) return first[0];
    }
    if (data?.detail) return data.detail;
    if (data?.title) return data.title;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
