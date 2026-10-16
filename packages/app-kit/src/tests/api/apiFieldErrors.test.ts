import { describe, expect, it } from "vitest";
import { apiFieldErrors } from "../../api";

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

  it("answers null for an error that did not come from the API", () => {
    expect(apiFieldErrors(new Error("boom"))).toBeNull();
  });
});
