import { describe, expect, it } from "vitest";
import * as admin from "../admin";
import * as api from "../api";
import * as session from "../session";
import * as sessionReact from "../session/react";
import * as testing from "../testing";
import * as ui from "../ui";

// Internals the components use. An entry point that exports them makes them public API.
describe("entry points", () => {
  it.each([
    ["session", session, "subscribeSessionPrompt"],
    ["session/react", sessionReact, "SignInRejected"],
    ["admin", admin, "STAT_SERIES_COLORS"],
    ["ui", ui, "CONTENT_IMAGE_WIDTHS"],
    ["api", api, "apiFieldErrorDetails"],
    ["testing", testing, "axiosSpies"],
    ["testing", testing, "axiosInstanceMock"],
  ])("%s keeps %s internal", (_entry, module, name) => {
    expect(Object.keys(module)).not.toContain(name);
  });

  it("still exports what apps use next to them", () => {
    expect(Object.keys(session)).toContain("getSessionPromptOpen");
    expect(Object.keys(sessionReact)).toContain("CredentialsForm");
    expect(Object.keys(admin)).toContain("StatHistoryChart");
    expect(Object.keys(ui)).toEqual(expect.arrayContaining(["ContentImage", "contentImageSrcSet"]));
    expect(Object.keys(api)).toContain("apiFieldErrors");
    expect(Object.keys(testing)).toEqual(expect.arrayContaining(["nextAuthMock", "resetTestMocks"]));
  });
});
