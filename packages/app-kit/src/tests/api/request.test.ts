import axios from "axios";
import { describe, expect, it } from "vitest";
import { apiFieldErrorDetails, apiFieldErrors, request } from "../../api";

const axiosError = (status: number, data?: unknown) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data },
  });

describe("request", () => {
  it("returns the response data", async () => {
    await expect(request(async () => ({ data: { id: 1 } }), "Failed")).resolves.toEqual({ id: 1 });
  });

  it("throws the API's own message", async () => {
    const call = () => Promise.reject(axiosError(400, "That name is taken."));

    await expect(request(call, "Could not save.")).rejects.toThrow("That name is taken.");
  });

  it("keeps a validation problem's field errors for apiFieldErrors, and the message as before", async () => {
    const problem = { title: "One or more validation errors occurred.", errors: { OrgNumber: ["Not valid."], PostalCode: ["Four digits."] } };

    const error = await request(() => Promise.reject(axiosError(400, problem)), "Could not save.").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Not valid.");
    expect(apiFieldErrors(error)).toEqual({ orgNumber: ["Not valid."], postalCode: ["Four digits."] });
  });

  it("carries only the field messages, not the response or a cause", async () => {
    const error = await request(() => Promise.reject(axiosError(400, { errors: { Title: ["Required."] } })), "Could not save.").catch((e: unknown) => e);

    expect(Object.keys(error as object)).toEqual(["fieldErrors", "fieldErrorDetails"]);
    expect((error as Error).cause).toBeUndefined();
  });

  it("keeps each field error's code and limit for apiFieldErrorDetails", async () => {
    const problem = {
      errors: { OrgNumber: ["Not valid."], CompanyName: ["At most 100 characters."] },
      codes: { OrgNumber: ["invalidOrgNumber"], CompanyName: ["tooLong"] },
      limits: { CompanyName: 100 },
    };

    const error = await request(() => Promise.reject(axiosError(400, problem)), "Could not save.").catch((e: unknown) => e);

    expect(apiFieldErrorDetails(error)).toEqual({
      orgNumber: [{ message: "Not valid.", code: "invalidOrgNumber" }],
      companyName: [{ message: "At most 100 characters.", code: "tooLong", limit: 100 }],
    });
  });

  it("adds no field errors to a failure without them", async () => {
    const error = await request(() => Promise.reject(axiosError(409, "That name is taken.")), "Could not save.").catch((e: unknown) => e);

    expect(Object.keys(error as object)).toEqual([]);
    expect(apiFieldErrors(error)).toBeNull();
  });

  it("rethrows a cancelled call unchanged, so the caller can tell it from a failure", async () => {
    const cancel = new axios.CanceledError();

    await expect(request(() => Promise.reject(cancel), "Could not load.")).rejects.toBe(cancel);
  });

  it("falls back to the given text and status messages", async () => {
    await expect(request(() => Promise.reject(axiosError(500)), "Could not save.")).rejects.toThrow("Could not save.");
    await expect(
      request(() => Promise.reject(axiosError(409)), "Could not save.", { 409: "Already exists." }),
    ).rejects.toThrow("Already exists.");
  });
});
