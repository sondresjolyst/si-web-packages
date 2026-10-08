import axios from "axios";
import { describe, expect, it } from "vitest";
import { request } from "../../api";

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
