import { describe, expect, it } from "vitest";
import { apiFieldErrorDetails, errorText, fieldErrorText, fieldErrorTexts, request } from "../../api";
import type { ApiFieldError } from "../../api";

const axiosError = (data: unknown) =>
  Object.assign(new Error("Request failed with status code 400"), { isAxiosError: true, response: { status: 400, data } });

const validation = { required: "Du må fylle ut dette feltet.", tooLong: "Bruk {max} eller færre tegn.", fixed: "Alltid denne." };

const problem = {
  errors: { OrgNumber: ["Required.", "Too long."], Name: ["Odd."] },
  codes: { OrgNumber: ["required", "tooLong"], Name: ["unknownCode"] },
  limits: { OrgNumber: 9 },
};

describe("apiFieldErrorDetails", () => {
  it("gives each message with its code and the field's limit, keyed in camelCase", () => {
    expect(apiFieldErrorDetails(axiosError(problem))).toEqual({
      orgNumber: [
        { message: "Required.", code: "required", limit: 9 },
        { message: "Too long.", code: "tooLong", limit: 9 },
      ],
      name: [{ message: "Odd.", code: "unknownCode" }],
    });
  });

  it("answers null when there are no field errors", () => {
    expect(apiFieldErrorDetails(axiosError({ message: "Nope." }))).toBeNull();
    expect(apiFieldErrorDetails(undefined)).toBeNull();
  });

  it("reads the Error that request throws", async () => {
    const error = await request(() => Promise.reject(axiosError(problem)), "Could not save.").catch((e: unknown) => e);

    expect(apiFieldErrorDetails(error)?.orgNumber?.[1]).toEqual({ message: "Too long.", code: "tooLong", limit: 9 });
  });
});

describe("fieldErrorText", () => {
  it("gives the text for the code", () => {
    expect(fieldErrorText({ message: "Required.", code: "required" }, validation)).toBe("Du må fylle ut dette feltet.");
    expect(fieldErrorText({ message: "x", code: "fixed", limit: 3 }, validation)).toBe("Alltid denne.");
  });

  it("fills in every {max} from the limit", () => {
    expect(fieldErrorText({ message: "Too long.", code: "tooLong", limit: 9 }, validation)).toBe("Bruk 9 eller færre tegn.");
    expect(fieldErrorText({ message: "x", code: "a", limit: 4 }, { a: "{max} og {max}" })).toBe("4 og 4");
  });

  it("gives the API's message when the code has no text, there is no code, or {max} has no limit", () => {
    expect(fieldErrorText({ message: "Odd.", code: "unknownCode" }, validation)).toBe("Odd.");
    expect(fieldErrorText({ message: "Plain." }, validation)).toBe("Plain.");
    expect(fieldErrorText({ message: "Too long.", code: "tooLong" }, validation)).toBe("Too long.");
  });

  it("does not read inherited properties as texts", () => {
    expect(fieldErrorText({ message: "Odd.", code: "toString" }, {})).toBe("Odd.");
    expect(fieldErrorText({ message: "Odd.", code: "constructor" }, {})).toBe("Odd.");
  });

  it("accepts the ApiFieldError type", () => {
    const error: ApiFieldError = { message: "m", code: "fixed" };

    expect(fieldErrorText(error, validation)).toBe("Alltid denne.");
  });
});

describe("fieldErrorTexts", () => {
  it("gives the text of each field error, keyed by field", () => {
    expect(fieldErrorTexts(axiosError(problem), validation)).toEqual({
      orgNumber: ["Du må fylle ut dette feltet.", "Bruk 9 eller færre tegn."],
      name: ["Odd."],
    });
  });

  it("answers an empty object when there are no field errors", () => {
    expect(fieldErrorTexts(axiosError({ message: "Nope." }), validation)).toEqual({});
  });
});

describe("errorText", () => {
  const errors = { lockedOut: "Kontoen er låst." };

  it("gives the text for the failure's code", () => {
    const error = Object.assign(new Error("Locked."), { errorCode: "lockedOut" });

    expect(errorText(error, errors, "Noe gikk galt.")).toBe("Kontoen er låst.");
  });

  it("gives the failure's message, or the fallback when it has none", () => {
    expect(errorText(new Error("Boom."), errors, "Noe gikk galt.")).toBe("Boom.");
    expect(errorText(new Error(""), errors, "Noe gikk galt.")).toBe("Noe gikk galt.");
    expect(errorText("text", errors, "Noe gikk galt.")).toBe("Noe gikk galt.");
  });
});
