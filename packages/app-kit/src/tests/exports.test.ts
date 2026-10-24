import { describe, expect, it } from "vitest";
import * as admin from "../admin";
import * as api from "../api";
import * as company from "../company";
import * as consent from "../consent";
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
    ["testing", testing, "axiosSpies"],
    ["testing", testing, "axiosInstanceMock"],
    ["consent", consent, "resetConsentStore"],
    ["consent", consent, "startPixel"],
    ["consent", consent, "stopPixel"],
    ["consent", consent, "trackPageView"],
    ["consent", consent, "clearPixelCookies"],
    ["consent", consent, "getStoredConsent"],
    ["consent", consent, "applyConsentOptions"],
    ["consent", consent, "recheckConsent"],
    ["consent", consent, "conflictsWithPage"],
    ["consent", consent, "assertNoticeVersion"],
  ])("%s keeps %s internal", (_entry, module, name) => {
    expect(Object.keys(module)).not.toContain(name);
  });

  it("still exports what apps use next to them", () => {
    expect(Object.keys(session)).toContain("getSessionPromptOpen");
    expect(Object.keys(sessionReact)).toContain("CredentialsForm");
    expect(Object.keys(admin)).toContain("StatHistoryChart");
    expect(Object.keys(ui)).toEqual(expect.arrayContaining(["ContentImage", "contentImageSrcSet"]));
    expect(Object.keys(api)).toEqual(
      expect.arrayContaining(["apiFieldErrors", "apiFieldErrorDetails", "fieldErrorText", "fieldErrorTexts", "errorText"]),
    );
    expect(api.formatOrgNumber).toBe(company.formatOrgNumber);
    expect(api.mergeCompanyInfo).toBe(company.mergeCompanyInfo);
    expect(Object.keys(consent)).toEqual(
      expect.arrayContaining(["ConsentBanner", "ConsentSettingsLink", "MetaPixel", "openConsentSettings", "setConsent", "closeConsentSettings", "trackPixel", "useConsent"]),
    );
    expect(Object.keys(testing)).toEqual(expect.arrayContaining(["nextAuthMock", "resetTestMocks"]));
  });
});
