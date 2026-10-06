import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { formatApiError } from "../errors";

function axiosError(data: unknown, status = 400, contentType = "application/json"): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, null, {
    data,
    status,
    statusText: "",
    headers: { "content-type": contentType },
    config,
  });
}

function networkError(): AxiosError {
  return new AxiosError("Network Error", "ERR_NETWORK", { headers: new AxiosHeaders() });
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

  it("reads a plain text body", () => {
    const error = axiosError("Invalid Norwegian phone number.", 400, "text/plain; charset=utf-8");
    expect(formatApiError(error, "fallback")).toBe("Invalid Norwegian phone number.");
  });

  it("reads a string sent as JSON", () => {
    const error = axiosError("Area parameter is required.", 400, "application/json; charset=utf-8");
    expect(formatApiError(error, "fallback")).toBe("Area parameter is required.");
  });

  it("ignores an HTML error page", () => {
    const page = "<html><body><h1>502 Bad Gateway</h1></body></html>";
    expect(formatApiError(axiosError(page, 502, "text/html"), "fallback")).toBe("fallback");
    expect(formatApiError(axiosError(page, 502, "text/plain"), "fallback")).toBe("fallback");
  });

  it("uses the status message when the body has none", () => {
    const messages = { 404: "Not found.", 502: "Payment provider unreachable." };
    expect(formatApiError(axiosError({}, 404), "fallback", messages)).toBe("Not found.");
    expect(formatApiError(axiosError("<html></html>", 502, "text/html"), "fallback", messages)).toBe(
      "Payment provider unreachable.",
    );
  });

  it("prefers the body over the status message", () => {
    const error = axiosError({ message: "No such device" }, 404);
    expect(formatApiError(error, "fallback", { 404: "Not found." })).toBe("No such device");
  });

  it("returns the fallback rather than axios's own message", () => {
    expect(formatApiError(axiosError({}, 500), "Could not save.")).toBe("Could not save.");
    expect(formatApiError(axiosError("", 500, "text/plain"), "Could not save.")).toBe("Could not save.");
    expect(formatApiError(networkError(), "Could not save.")).toBe("Could not save.");
  });

  it("ignores a text body on a 5xx, so a proxy's answer does not hide the status message", () => {
    const messages = { 502: "Payment provider unreachable." };
    expect(formatApiError(axiosError("Bad Gateway", 502, "text/plain"), "fallback", messages)).toBe(
      "Payment provider unreachable.",
    );
    expect(formatApiError(axiosError("no healthy upstream", 503, "text/plain"), "fallback")).toBe("fallback");
  });

  it("ignores a text body that spans lines, such as a stack trace", () => {
    const trace = "System.InvalidOperationException: boom\n   at Api.Controllers.Users.Create()";
    expect(formatApiError(axiosError(trace, 400, "text/plain"), "fallback")).toBe("fallback");
  });

  it("skips fields that are not text", () => {
    expect(formatApiError(axiosError({ message: { code: "E42" }, title: "Title text" }), "fallback")).toBe(
      "Title text",
    );
    expect(formatApiError(axiosError({ title: 404 }), "fallback")).toBe("fallback");
  });

  it("reads validation errors given as plain strings", () => {
    const map = axiosError({ errors: { email: "Email is required" } });
    const list = axiosError({ errors: ["Email is required"] });
    expect(formatApiError(map, "fallback")).toBe("Email is required");
    expect(formatApiError(list, "fallback")).toBe("Email is required");
  });

  it("takes the first validation error that has one", () => {
    const error = axiosError({ errors: { name: [], email: ["Email is invalid"] } });
    expect(formatApiError(error, "fallback")).toBe("Email is invalid");
  });

  it("uses status 0 for a request that got no response", () => {
    const messages = { 0: "Check your connection and try again." };
    expect(formatApiError(networkError(), "fallback", messages)).toBe("Check your connection and try again.");
  });

  it("uses the message of a plain Error", () => {
    expect(formatApiError(new Error("Network down"), "fallback")).toBe("Network down");
  });

  it("returns the fallback for anything else", () => {
    expect(formatApiError("nope", "fallback")).toBe("fallback");
    expect(formatApiError(undefined, "fallback")).toBe("fallback");
  });
});
