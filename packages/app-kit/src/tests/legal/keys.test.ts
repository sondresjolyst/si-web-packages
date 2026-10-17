import { describe, expect, it } from "vitest";
import { LEGAL_PAGE_KEYS } from "../../legal";
import { LEGAL_PAGE_KEYS as seoKeys } from "../../seo";

describe("LEGAL_PAGE_KEYS", () => {
  it("holds the same default pages as the API, in both entry points", () => {
    expect(LEGAL_PAGE_KEYS).toEqual(["terms", "privacy", "cookies"]);
    expect(seoKeys).toBe(LEGAL_PAGE_KEYS);
  });
});
