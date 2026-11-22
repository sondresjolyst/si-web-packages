import type { AxiosInstance } from "axios";
import { request } from "./request";

/**
 * The body of `register` on SjolystInnovation.AppKit.Auth. The terms go in `termsAccepted` and
 * `termsVersion`. Each further document the API lists, such as `privacy`, goes in `documents` with
 * the version the person saw. The API checks the lengths and the user name rules, so show its field
 * errors.
 */
export interface SignUpRequest {
  email: string;
  password: string;
  ageConfirmed: boolean;
  termsAccepted: boolean;
  termsVersion: string;
  userName?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  locale?: string | undefined;
  documents?: Record<string, string> | undefined;
}

/**
 * The body of `accept-terms`. Without `document` it accepts the terms. With `document` it accepts
 * that document, and `termsVersion` holds the version of that document.
 */
export interface AcceptTermsRequest {
  termsVersion: string;
  document?: string | undefined;
  locale?: string | undefined;
}

/** A document the signed-in user has to accept again, with its current version. */
export interface PendingConsent {
  document: string;
  version: string;
}

/**
 * Creates the calls for the opt-in sign-up of SjolystInnovation.AppKit.Auth. `register` is
 * anonymous and goes through `publicApi`. The other three act for the signed-in user through `api`.
 * A verified email ends every session at the API, so the user signs in again after `verifyEmail`.
 */
export function createSignUpService(api: AxiosInstance, publicApi: AxiosInstance) {
  return {
    register: (data: SignUpRequest) =>
      request(() => publicApi.post<{ message: string }>("/auth/register", data), "Failed to sign up"),

    verifyEmail: (data: { code: string }) =>
      request(() => api.post<{ message: string }>("/auth/verify-email", data), "Failed to verify email"),

    resendVerification: () =>
      request(() => api.post<{ message: string }>("/auth/resend-verification"), "Failed to send a new code"),

    async acceptTerms(data: AcceptTermsRequest): Promise<void> {
      await request(() => api.post("/auth/accept-terms", data), "Failed to accept the terms");
    },
  };
}
