import { AxiosError, AxiosHeaders, CanceledError } from "axios";
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

  it("falls through to detail", () => {
    expect(formatApiError(axiosError({ detail: "Detail text" }), "fallback")).toBe("Detail text");
  });

  it("skips an empty validation list", () => {
    const error = axiosError({ errors: { Email: [] }, detail: "Detail text" });
    expect(formatApiError(error, "fallback")).toBe("Detail text");
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

  it("on a 5xx puts the caller's status message above the body", () => {
    expect(
      formatApiError(axiosError("Bad Gateway", 502, "text/plain"), "fallback", { 502: "Payment provider unreachable." }),
    ).toBe("Payment provider unreachable.");
    expect(
      formatApiError(axiosError({ message: "Endpoint request timed out" }, 504), "fallback", { 504: "The server is slow." }),
    ).toBe("The server is slow.");
  });

  it("on a 5xx shows the API's own message when the caller has none for that status", () => {
    const text = axiosError("Failed to regenerate invoice.", 500, "text/plain; charset=utf-8");
    const problem = axiosError(
      { title: "Bad Gateway", detail: "Failed to fetch email stats from Brevo.", status: 502 },
      502,
      "application/problem+json",
    );
    expect(formatApiError(text, "fallback")).toBe("Failed to regenerate invoice.");
    expect(formatApiError(problem, "fallback")).toBe("Failed to fetch email stats from Brevo.");
  });

  it("ignores a text body that spans lines, such as a stack trace", () => {
    const trace = "System.InvalidOperationException: boom\n   at Api.Controllers.Users.Create()";
    expect(formatApiError(axiosError(trace, 400, "text/plain"), "fallback")).toBe("fallback");
  });

  it("treats a carriage return or a Unicode line separator as a line break", () => {
    for (const body of ["Line one\rLine two", "Line one\u2028Line two", "Line one\u2029Line two"]) {
      expect(formatApiError(axiosError(body, 400, "text/plain"), "fallback")).toBe("fallback");
    }
  });

  it("skips fields that are not text", () => {
    expect(formatApiError(axiosError({ message: { code: "E42" }, detail: "Detail text" }), "fallback")).toBe(
      "Detail text",
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
    const timeout = new AxiosError("timeout of 10000ms exceeded", "ECONNABORTED", { headers: new AxiosHeaders() });
    expect(formatApiError(networkError(), "fallback", messages)).toBe("Check your connection and try again.");
    expect(formatApiError(timeout, "fallback", messages)).toBe("Check your connection and try again.");
  });

  it("uses status 0 for the network failures Node reports on the server", () => {
    const messages = { 0: "Check your connection and try again." };
    for (const code of ["ECONNREFUSED", "ENOTFOUND", "ECONNRESET"]) {
      const error = new AxiosError(`connect ${code}`, code, { headers: new AxiosHeaders() });
      expect(formatApiError(error, "fallback", messages)).toBe("Check your connection and try again.");
    }
  });

  it("does not blame the connection for a request the app set up wrong", () => {
    const badUrl = new AxiosError("Invalid URL", "ERR_INVALID_URL", { headers: new AxiosHeaders() });
    expect(formatApiError(badUrl, "fallback", { 0: "Check your connection and try again." })).toBe("fallback");
  });

  it("never shows a problem details title, which ASP.NET Core fills with generic text", () => {
    const conflict = axiosError({ title: "Conflict", status: 409 }, 409);
    const crash = axiosError({ title: "An error occurred while processing your request.", status: 500 }, 500);
    expect(formatApiError(conflict, "Could not save.", { 409: "That email is taken." })).toBe("That email is taken.");
    expect(formatApiError(conflict, "Could not save.")).toBe("Could not save.");
    expect(formatApiError(crash, "Could not save.")).toBe("Could not save.");
  });

  it("ranks detail above the status message", () => {
    const error = axiosError({ title: "Conflict", detail: "That email is already registered." }, 409);
    expect(formatApiError(error, "fallback", { 409: "That email is taken." })).toBe(
      "That email is already registered.",
    );
  });

  it("ignores JSON fields that span lines, such as an exception in detail", () => {
    const error = axiosError({ detail: "System.NullReferenceException: boom\n   at Api.Users.Create()" }, 400);
    expect(formatApiError(error, "fallback")).toBe("fallback");
  });

  it("trims a JSON message", () => {
    expect(formatApiError(axiosError({ message: "  Name is taken\n" }), "fallback")).toBe("Name is taken");
  });

  it("gives the fallback for a cancelled request, not the no response message", () => {
    const messages = { 0: "Check your connection and try again." };
    expect(formatApiError(new CanceledError(), "fallback", messages)).toBe("fallback");
  });

  it("reads a message given as a list of strings", () => {
    const error = axiosError({ statusCode: 400, message: ["email must be an email"], error: "Bad Request" });
    expect(formatApiError(error, "fallback")).toBe("email must be an email");
  });

  it("parses a JSON body that axios left as text", () => {
    const problem = JSON.stringify({ title: "One or more validation errors occurred.", errors: { Email: ["Email is invalid"] } });
    expect(formatApiError(axiosError(problem, 400, "application/problem+json"), "fallback")).toBe("Email is invalid");
    expect(formatApiError(axiosError(JSON.stringify("Area parameter is required."), 400), "fallback")).toBe(
      "Area parameter is required.",
    );
  });

  it("gives the fallback for a bare JSON value that axios left as text", () => {
    for (const body of ["null", "true", "42"]) {
      expect(formatApiError(axiosError(body, 400, "application/json"), "fallback")).toBe("fallback");
    }
  });

  it("does not read fields off a Document or binary body", () => {
    const page = new DOMParser().parseFromString(
      "<html><head><title>502 Bad Gateway</title></head><body></body></html>",
      "text/html",
    );
    expect(formatApiError(axiosError(page, 502, "text/html"), "fallback")).toBe("fallback");
    expect(formatApiError(axiosError(new ArrayBuffer(8), 400, "application/json"), "fallback")).toBe("fallback");
  });

  it("uses the message of a plain Error", () => {
    expect(formatApiError(new Error("Network down"), "fallback")).toBe("Network down");
  });

  it("gives the fallback for an Error whose message is empty or spans lines", () => {
    expect(formatApiError(new Error(), "fallback")).toBe("fallback");
    expect(formatApiError(new Error("[\n  { \"code\": \"invalid_type\" }\n]"), "fallback")).toBe("fallback");
  });

  it("returns the fallback for anything else", () => {
    expect(formatApiError("nope", "fallback")).toBe("fallback");
    expect(formatApiError(undefined, "fallback")).toBe("fallback");
  });
});
