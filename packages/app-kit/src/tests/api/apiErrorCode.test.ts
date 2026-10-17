import { describe, expect, it } from "vitest";
import { apiErrorCode, request } from "../../api";
import { errorText } from "../../api/fieldErrorText";

const axiosError = (status: number, data?: unknown, code?: string) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    ...(code ? { code } : {}),
    response: { status, data },
  });

const thrown = (data: unknown) => request(() => Promise.reject(axiosError(400, data)), "Could not save.").catch((e: unknown) => e);

describe("apiErrorCode", () => {
  it("reads the code from a failed call, its body, and the body as text", () => {
    const body = { message: "Invalid or expired reset code.", code: "invalidResetCode" };

    expect(apiErrorCode(axiosError(400, body))).toBe("invalidResetCode");
    expect(apiErrorCode(body)).toBe("invalidResetCode");
    expect(apiErrorCode(axiosError(400, JSON.stringify(body)))).toBe("invalidResetCode");
  });

  it("reads the code that request keeps on its Error, next to the message as before", async () => {
    const error = await thrown({ message: "Too many attempts. Request a new reset code.", code: "tooManyResetAttempts" });

    expect((error as Error).message).toBe("Too many attempts. Request a new reset code.");
    expect(apiErrorCode(error)).toBe("tooManyResetAttempts");
    expect(Object.keys(error as object)).toEqual(["errorCode"]);
  });

  it("keeps no code on a failure without one", async () => {
    const error = await thrown({ message: "Nope." });

    expect(Object.keys(error as object)).toEqual([]);
    expect(apiErrorCode(error)).toBeUndefined();
  });

  it("reads a body that has a response field as a body, not as a failed call", () => {
    expect(apiErrorCode({ code: "lockedOut", response: { data: { code: "other" } } })).toBe("lockedOut");
  });

  it("never takes axios's own code or an Error's code for the API's", () => {
    expect(apiErrorCode(axiosError(400, undefined, "ERR_BAD_REQUEST"))).toBeUndefined();
    expect(apiErrorCode(Object.assign(new Error("down"), { code: "ECONNREFUSED" }))).toBeUndefined();
    expect(apiErrorCode(Object.assign(new Error("down"), { isAxiosError: true, code: "ERR_NETWORK" }))).toBeUndefined();
  });

  it("answers undefined for a code that is empty or not text, and for anything that is not a body", () => {
    for (const code of ["", 7, null, ["lockedOut"]]) {
      expect(apiErrorCode({ message: "x", code })).toBeUndefined();
    }
    for (const value of [undefined, null, "Invalid email or password.", "\"lockedOut\"", 42, [{ code: "lockedOut" }]]) {
      expect(apiErrorCode(value)).toBeUndefined();
    }
    expect(apiErrorCode(Object.assign(new Error("x"), { errorCode: 7 }))).toBeUndefined();
  });
});

describe("errorText", () => {
  const errors = { lockedOut: "Innloggingen er låst. Prøv igjen senere." };

  it("gives the app's text for a known code", async () => {
    expect(errorText(await thrown({ message: "Too many failed attempts.", code: "lockedOut" }), errors, "Failed")).toBe(errors.lockedOut);
  });

  it("gives the API's message for an unknown code or none, and the fallback without a message", async () => {
    expect(errorText(await thrown({ message: "Something new.", code: "somethingNew" }), errors, "Failed")).toBe("Something new.");
    expect(errorText(new Error("Plain."), errors, "Failed")).toBe("Plain.");
    expect(errorText(new Error(""), errors, "Failed")).toBe("Failed");
    expect(errorText("nope", errors, "Failed")).toBe("Failed");
  });

  it("does not read a code named like an Object property as text", async () => {
    expect(errorText(await thrown({ message: "Odd.", code: "toString" }), errors, "Failed")).toBe("Odd.");
  });
});
