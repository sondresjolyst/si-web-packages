import axios, { type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  apiErrorCode,
  apiFieldErrorDetails,
  createSignUpService,
  request,
  termsChangedDocument,
  type AcceptTermsRequest,
  type PendingConsent,
  type SignUpRequest,
} from "../../api";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("next-auth/react", () => ({ getSession }));

interface Sent {
  method: string;
  url: string;
  data?: unknown;
  client: string;
}

/** An axios instance that records each request and answers with `reply`, or fails with `status`. */
function fakeClient(name: string, sent: Sent[], reply: () => unknown = () => ({}), status = 200) {
  const client = axios.create({ baseURL: "https://api.example.no/api", allowAbsoluteUrls: false });
  client.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    sent.push({
      method: config.method!,
      url: config.url!,
      data: typeof config.data === "string" ? JSON.parse(config.data) : config.data,
      client: name,
    });
    const response = { data: reply(), status, statusText: "", headers: {}, config };
    if (status >= 400) {
      throw Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response, config });
    }
    return response;
  };
  return client;
}

const axiosError = (status: number, data?: unknown) =>
  Object.assign(new Error(`Request failed with status code ${status}`), { isAxiosError: true, response: { status, data } });

let sent: Sent[];
beforeEach(() => {
  sent = [];
  getSession.mockReset().mockResolvedValue({ user: { id: "u1" } });
});

const signUp = (reply?: () => unknown, status?: number) =>
  createSignUpService(fakeClient("api", sent, reply, status), fakeClient("public", sent, reply, status));

const registration: SignUpRequest = {
  email: "ada@example.com",
  password: "Password1",
  ageConfirmed: true,
  termsAccepted: true,
  termsVersion: "2026-11-01",
  documents: { privacy: "2026-10-15" },
  locale: "en",
};

describe("createSignUpService", () => {
  it("registers on the anonymous client with the body as given", async () => {
    await expect(signUp(() => ({ message: "Check your email." })).register(registration)).resolves.toEqual({ message: "Check your email." });

    expect(sent).toEqual([{ method: "post", url: "/auth/register", data: registration, client: "public" }]);
  });

  it("verifies, resends and accepts on the signed-in client", async () => {
    const service = signUp(() => ({ message: "Done." }));

    await expect(service.verifyEmail({ code: "123456" })).resolves.toEqual({ message: "Done." });
    await expect(service.resendVerification()).resolves.toEqual({ message: "Done." });
    await service.acceptTerms({ termsVersion: "2026-12-01", document: "privacy", locale: "en" });

    expect(sent).toEqual([
      { method: "post", url: "/auth/verify-email", data: { code: "123456" }, client: "api" },
      { method: "post", url: "/auth/resend-verification", data: undefined, client: "api" },
      { method: "post", url: "/auth/accept-terms", data: { termsVersion: "2026-12-01", document: "privacy", locale: "en" }, client: "api" },
    ]);
  });

  it("answers nothing for an acceptance, since the API answers 204", async () => {
    await expect(signUp(() => "").acceptTerms({ termsVersion: "v1" })).resolves.toBeUndefined();
  });

  it("falls back to its own message when the API gives none", async () => {
    const service = signUp(() => "", 500);

    await expect(service.register(registration)).rejects.toThrow("Failed to sign up");
    await expect(service.verifyEmail({ code: "1" })).rejects.toThrow("Failed to verify email");
    await expect(service.resendVerification()).rejects.toThrow("Failed to send a new code");
    await expect(service.acceptTerms({ termsVersion: "v1" })).rejects.toThrow("Failed to accept the terms");
  });

  it("keeps the API's code and field errors, such as a user name the server refuses", async () => {
    const problem = {
      errors: { UserName: ["User name is too long."], "Documents.privacy": ["Accept the privacy policy."] },
      codes: { UserName: ["tooLong"], "Documents.privacy": ["termsNotAccepted"] },
      limits: { UserName: 50 },
    };
    const error = await signUp(() => problem, 400).register(registration).catch((e: unknown) => e);

    expect(apiFieldErrorDetails(error)).toEqual({
      userName: [{ message: "User name is too long.", code: "tooLong", limit: 50 }],
      "documents.privacy": [{ message: "Accept the privacy policy.", code: "termsNotAccepted" }],
    });

    const conflict = await signUp(() => ({ message: "Changed.", code: "termsChanged", document: "privacy" }), 409)
      .acceptTerms({ termsVersion: "old", document: "privacy" })
      .catch((e: unknown) => e);

    expect(apiErrorCode(conflict)).toBe("termsChanged");
    expect(termsChangedDocument(conflict)).toBe("privacy");
  });

  it("types the request and the pending documents", () => {
    expectTypeOf<SignUpRequest["documents"]>().toEqualTypeOf<Record<string, string> | undefined>();
    expectTypeOf<AcceptTermsRequest>().toHaveProperty("document");
    expectTypeOf<PendingConsent>().toEqualTypeOf<{ document: string; version: string }>();
  });
});

describe("termsChangedDocument", () => {
  const body = { message: "The document privacy has changed.", code: "termsChanged", document: "privacy" };

  it("reads the document from a failed call, its body, and the body as text", () => {
    expect(termsChangedDocument(axiosError(409, body))).toBe("privacy");
    expect(termsChangedDocument(body)).toBe("privacy");
    expect(termsChangedDocument(axiosError(409, JSON.stringify(body)))).toBe("privacy");
  });

  it("reads the document that request keeps on its Error, next to the code", async () => {
    const error = await request(() => Promise.reject(axiosError(409, body)), "Failed").catch((e: unknown) => e);

    expect((error as Error).message).toBe("The document privacy has changed.");
    expect(termsChangedDocument(error)).toBe("privacy");
    expect(Object.keys(error as object)).toEqual(["errorCode", "errorDocument"]);
  });

  it("answers undefined for a change of the terms, which has no document", async () => {
    const terms = { message: "The terms have changed.", code: "termsChanged" };
    const error = await request(() => Promise.reject(axiosError(409, terms)), "Failed").catch((e: unknown) => e);

    expect(termsChangedDocument(terms)).toBeUndefined();
    expect(termsChangedDocument(error)).toBeUndefined();
    expect(Object.keys(error as object)).toEqual(["errorCode"]);
  });

  it("answers undefined for another code, even one with a document", async () => {
    const other = { message: "Nope.", code: "lastAdmin", document: "privacy" };
    const error = await request(() => Promise.reject(axiosError(409, other)), "Failed").catch((e: unknown) => e);

    expect(termsChangedDocument(other)).toBeUndefined();
    expect(termsChangedDocument(error)).toBeUndefined();
    expect(Object.keys(error as object)).toEqual(["errorCode"]);
    expect(termsChangedDocument(Object.assign(new Error("x"), { errorCode: "lastAdmin", errorDocument: "privacy" }))).toBeUndefined();
  });

  it("answers undefined for a document that is empty or not text, and for anything that is not a body", () => {
    for (const document of ["", 7, null, ["privacy"], { name: "privacy" }]) {
      expect(termsChangedDocument({ code: "termsChanged", document })).toBeUndefined();
    }
    for (const value of [undefined, null, "termsChanged", 42, [body], "{not json"]) {
      expect(termsChangedDocument(value)).toBeUndefined();
    }
    expect(termsChangedDocument(Object.assign(new Error("x"), { errorCode: "termsChanged", errorDocument: 7 }))).toBeUndefined();
  });
});
