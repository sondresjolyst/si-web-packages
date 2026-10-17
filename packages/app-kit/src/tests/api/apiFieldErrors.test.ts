import { describe, expect, it } from "vitest";
import { apiFieldErrors } from "../../api";
import { apiFieldErrorDetails } from "../../api/apiFieldErrors";

const axiosError = (data: unknown) =>
  Object.assign(new Error("Request failed with status code 400"), { isAxiosError: true, response: { status: 400, data } });

describe("apiFieldErrors", () => {
  it("reads an ASP.NET validation problem from a failed call, keyed in camelCase", () => {
    const problem = { title: "One or more validation errors occurred.", errors: { OrgNumber: ["Not valid."], PostalCode: ["Four digits.", "Needs a place."] } };

    expect(apiFieldErrors(axiosError(problem))).toEqual({ orgNumber: ["Not valid."], postalCode: ["Four digits.", "Needs a place."] });
  });

  it("reads the response body as well", () => {
    expect(apiFieldErrors({ errors: { Email: "Taken." } })).toEqual({ email: ["Taken."] });
  });

  it("keeps a key that is already camelCase and merges keys that meet", () => {
    expect(apiFieldErrors({ errors: { userName: ["Taken."], UserName: ["Too short."] } })).toEqual({ userName: ["Taken.", "Too short."] });
  });

  it("treats keys named like Object properties as plain fields", () => {
    const body = JSON.parse('{"errors":{"__proto__":["A."],"Constructor":["B."],"toString":["C."]}}');

    const fields = apiFieldErrors(body);

    expect(Object.keys(fields!).sort()).toEqual(["__proto__", "constructor", "toString"]);
    expect(Object.getOwnPropertyDescriptor(fields, "__proto__")?.value).toEqual(["A."]);
    expect(fields!.constructor).toEqual(["B."]);
    expect(fields!.toString).toEqual(["C."]);
    expect(Object.getPrototypeOf(fields)).toBe(Object.prototype);
  });

  it("drops empty and non-text messages", () => {
    expect(apiFieldErrors({ errors: { Title: ["", 3, null, "Required."], Body: [] } })).toEqual({ title: ["Required."] });
  });

  it.each([
    ["no errors", { title: "Bad request" }],
    ["empty errors", { errors: {} }],
    ["errors that are not an object", { errors: "nope" }],
    ["errors that are a list", { errors: ["Not valid."] }],
    ["only empty messages", { errors: { Title: [""] } }],
    ["a text body", "Invalid email or password."],
    ["no body", undefined],
    ["null", null],
  ])("answers null for %s", (_name, data) => {
    expect(apiFieldErrors(axiosError(data))).toBeNull();
    expect(apiFieldErrors(data)).toBeNull();
  });

  it("reads the field errors that request keeps on its Error", () => {
    const error = Object.assign(new Error("Not valid."), { fieldErrors: { orgNumber: ["Not valid."] } });

    expect(apiFieldErrors(error)).toEqual({ orgNumber: ["Not valid."] });
  });

  it("ignores an errors property on an Error", () => {
    expect(apiFieldErrors(Object.assign(new Error("boom"), { errors: { Title: ["Required."] } }))).toBeNull();
  });

  it("answers null for an error that did not come from the API", () => {
    expect(apiFieldErrors(new Error("boom"))).toBeNull();
  });
});

describe("apiFieldErrorDetails", () => {
  it("pairs each message with its code and the field's limit, keyed in camelCase", () => {
    const problem = {
      errors: { OrgNumber: ["Not valid."], CompanyName: ["At most 100 characters."], PostalCode: ["Four digits.", "Needs a place."] },
      codes: { OrgNumber: ["invalidOrgNumber"], CompanyName: ["tooLong"], PostalCode: ["invalidPostalCode", "placeRequired"] },
      limits: { CompanyName: 100 },
    };

    expect(apiFieldErrorDetails(axiosError(problem))).toEqual({
      orgNumber: [{ message: "Not valid.", code: "invalidOrgNumber" }],
      companyName: [{ message: "At most 100 characters.", code: "tooLong", limit: 100 }],
      postalCode: [
        { message: "Four digits.", code: "invalidPostalCode" },
        { message: "Needs a place.", code: "placeRequired" },
      ],
    });
  });

  it("gives only the messages when the problem has no codes or limits", () => {
    expect(apiFieldErrorDetails({ errors: { OrgNumber: ["Not valid."] } })).toEqual({ orgNumber: [{ message: "Not valid." }] });
    expect(apiFieldErrorDetails({ errors: { OrgNumber: ["Not valid."] }, codes: "nope", limits: ["nope"] })).toEqual({ orgNumber: [{ message: "Not valid." }] });
  });

  it("reads a single code or message that is not in a list", () => {
    expect(apiFieldErrorDetails({ errors: { Email: "Taken." }, codes: { Email: "taken" } })).toEqual({ email: [{ message: "Taken.", code: "taken" }] });
  });

  it("keeps a code next to its own message when an empty message is dropped before it", () => {
    const problem = { errors: { Title: ["", "Required."] }, codes: { Title: ["blank", "required"] } };

    expect(apiFieldErrorDetails(problem)).toEqual({ title: [{ message: "Required.", code: "required" }] });
  });

  it("drops codes and limits of the wrong type", () => {
    const problem = { errors: { A: ["One."], B: ["Two."], C: ["Three."] }, codes: { A: [3], B: [""], C: ["ok"] }, limits: { A: "100", B: Number.NaN, C: null } };

    expect(apiFieldErrorDetails(problem)).toEqual({ a: [{ message: "One." }], b: [{ message: "Two." }], c: [{ message: "Three.", code: "ok" }] });
  });

  it("finds no code or limit for a field named like an Object property", () => {
    const body = JSON.parse('{"errors":{"__proto__":["A."],"constructor":["B."],"toString":["C."]},"codes":{},"limits":{}}');

    const fields = apiFieldErrorDetails(body)!;

    expect(Object.getOwnPropertyDescriptor(fields, "__proto__")?.value).toEqual([{ message: "A." }]);
    expect(fields.constructor).toEqual([{ message: "B." }]);
    expect(fields.toString).toEqual([{ message: "C." }]);
  });

  it("reads the details that request keeps on its Error, and drops malformed ones", () => {
    const error = Object.assign(new Error("Not valid."), {
      fieldErrors: { orgNumber: ["Not valid."] },
      fieldErrorDetails: {
        orgNumber: [{ message: "Not valid.", code: "invalidOrgNumber", limit: 9 }, { message: "" }, "Loose.", null],
        postalCode: "nope",
      },
    });

    expect(apiFieldErrorDetails(error)).toEqual({ orgNumber: [{ message: "Not valid.", code: "invalidOrgNumber", limit: 9 }] });
    expect(apiFieldErrors(error)).toEqual({ orgNumber: ["Not valid."] });
  });

  it("falls back to the messages on an Error that has no details", () => {
    const error = Object.assign(new Error("Not valid."), { fieldErrors: { orgNumber: ["Not valid."] }, fieldErrorDetails: ["nope"] });

    expect(apiFieldErrorDetails(error)).toEqual({ orgNumber: [{ message: "Not valid." }] });
  });

  it.each([
    ["no errors", { codes: { OrgNumber: ["invalidOrgNumber"] } }],
    ["only empty messages", { errors: { Title: [""] }, codes: { Title: ["required"] } }],
    ["null", null],
  ])("answers null for %s", (_name, data) => {
    expect(apiFieldErrorDetails(axiosError(data))).toBeNull();
    expect(apiFieldErrorDetails(data)).toBeNull();
  });

  it("answers null for an Error without field errors", () => {
    expect(apiFieldErrorDetails(new Error("boom"))).toBeNull();
    expect(apiFieldErrorDetails(Object.assign(new Error("boom"), { fieldErrorDetails: {} }))).toBeNull();
  });
});
