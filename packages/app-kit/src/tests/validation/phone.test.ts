import { describe, expect, it } from "vitest";
import { normalizeNoPhone } from "../../validation";

describe("normalizeNoPhone", () => {
  it("adds the country code to an eight-digit number", () => {
    expect(normalizeNoPhone("91234567")).toBe("4791234567");
  });

  it("drops spaces, dashes, brackets, and a plus", () => {
    expect(normalizeNoPhone("91 23 45 67")).toBe("4791234567");
    expect(normalizeNoPhone("+47 912-34-567")).toBe("4791234567");
    expect(normalizeNoPhone("(47) 91234567")).toBe("4791234567");
  });

  it("keeps a ten-digit number that starts with 47", () => {
    expect(normalizeNoPhone("4791234567")).toBe("4791234567");
  });

  it("refuses a number of the wrong length", () => {
    expect(normalizeNoPhone("1234567")).toBeNull();
    expect(normalizeNoPhone("12345678901")).toBeNull();
    expect(normalizeNoPhone("479123456")).toBeNull();
  });

  it("refuses a ten-digit number that does not start with 47", () => {
    expect(normalizeNoPhone("1234567890")).toBeNull();
  });

  it("refuses an empty, blank, missing, or non-ASCII-digit value", () => {
    expect(normalizeNoPhone("")).toBeNull();
    expect(normalizeNoPhone("   ")).toBeNull();
    expect(normalizeNoPhone(null)).toBeNull();
    expect(normalizeNoPhone(undefined)).toBeNull();
    expect(normalizeNoPhone("٩١٢٣٤٥٦٧")).toBeNull();
  });

  it("is the same as the server for a number with a letter in it", () => {
    expect(normalizeNoPhone("9123abc4567")).toBe("4791234567");
  });
});
