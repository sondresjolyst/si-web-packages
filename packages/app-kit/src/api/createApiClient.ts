import axios, { type AxiosInstance } from "axios";
import { getSession } from "next-auth/react";
import { isTerminalSessionError, openSessionPrompt } from "../session/expiry";

/**
 * An axios instance for the signed-in API, for browser code. Each request carries the session's
 * access token. A 401 on a dead session opens the re-sign-in prompt, so the page keeps its state.
 */
export function createApiClient(baseURL: string): AxiosInstance {
  if (!baseURL) {
    throw new Error("createApiClient needs the API base URL, and baseURL is empty.");
  }
  // allowAbsoluteUrls: false joins every URL onto baseURL, so the token only goes to the API.
  const client = axios.create({ baseURL, allowAbsoluteUrls: false });

  // broadcast: false, so a request does not make every other open tab refetch its session.
  client.interceptors.request.use(async (request) => {
    const session = await getSession({ broadcast: false });
    const accessToken = (session as { accessToken?: string } | null)?.accessToken;
    if (accessToken) {
      request.headers.Authorization = `Bearer ${accessToken}`;
    }
    return request;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        const session = await getSession({ broadcast: false });
        // No session also opens the prompt. The cookie is gone, or the session fetch failed. Either
        // way there is no error field to read, and signing in again recovers both.
        const sessionError = (session as { error?: string } | null)?.error;
        if (!session || isTerminalSessionError(sessionError)) {
          openSessionPrompt();
        }
      }
      return Promise.reject(error);
    },
  );

  return client;
}
