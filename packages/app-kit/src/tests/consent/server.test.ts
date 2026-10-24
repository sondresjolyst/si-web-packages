// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getConsent, trackPixel } from "../../consent";

describe("consent on the server", () => {
  it("never consents and never reads storage", () => {
    expect(typeof window).toBe("undefined");
    expect(getConsent()).toEqual({ ready: false, record: null, marketing: false, reopened: false });
  });

  it("tracks nothing", () => {
    expect(trackPixel("PageView")).toBe(false);
  });
});
