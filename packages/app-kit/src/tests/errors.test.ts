import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { formatApiError } from "../errors";

function axiosError(data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, null, {
    data,
    status: 400,
    statusText: "Bad Request",
    headers: {},
    config,
  });
}

describe("formatApiError", () => {
  it("prefers the message field", () => {
    const error = axiosError({ message: "Name is taken", detail: "ignored" });
    expect(formatApiError(error, "fallback")).toBe("Name is taken");
  });

  it("uses the first validation error when there is no message", () => {
    const error = axiosError({ errors: { Email: ["Email is invalid", "second"] } });
    expect(formatApiError(error, "fallback")).toBe("Email is invalid");
  });

  it("falls through to detail, then title", () => {
    expect(formatApiError(axiosError({ detail: "Detail text" }), "fallback")).toBe("Detail text");
    expect(formatApiError(axiosError({ title: "Title text" }), "fallback")).toBe("Title text");
  });

  it("skips an empty validation list", () => {
    const error = axiosError({ errors: { Email: [] }, title: "Title text" });
    expect(formatApiError(error, "fallback")).toBe("Title text");
  });

  it("uses the message of a plain Error", () => {
    expect(formatApiError(new Error("Network down"), "fallback")).toBe("Network down");
  });

  it("returns the fallback for anything else", () => {
    expect(formatApiError("nope", "fallback")).toBe("fallback");
    expect(formatApiError(undefined, "fallback")).toBe("fallback");
  });
});
