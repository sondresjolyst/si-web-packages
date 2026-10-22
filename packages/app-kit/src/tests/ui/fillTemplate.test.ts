import { describe, expect, it } from "vitest";
import { fillTemplate } from "../../ui";

describe("fillTemplate", () => {
  it("fills each placeholder, also when one repeats", () => {
    expect(fillTemplate("Added {role} to {name}. {name} is done.", { name: "Kari", role: "Admin" })).toBe("Added Admin to Kari. Kari is done.");
  });

  it("writes a number as its digits", () => {
    expect(fillTemplate("Page {page} of {pages}", { page: 2, pages: 10 })).toBe("Page 2 of 10");
  });

  it("keeps a placeholder with no value, and leaves other braces alone", () => {
    expect(fillTemplate("{a} and {b} and { c } and {}", { a: "x" })).toBe("x and {b} and { c } and {}");
  });

  it("does not read the object's inherited keys", () => {
    expect(fillTemplate("{toString} {constructor}", {})).toBe("{toString} {constructor}");
  });

  it("inserts a value with $ patterns as it is typed", () => {
    expect(fillTemplate("Cost {price}", { price: "$& $1 $$" })).toBe("Cost $& $1 $$");
  });

  it("does not fill a placeholder that a value brings in", () => {
    expect(fillTemplate("{a} {b}", { a: "{b}", b: "z" })).toBe("{b} z");
  });

  it("returns text without placeholders unchanged", () => {
    expect(fillTemplate("Plain", { a: "x" })).toBe("Plain");
  });
});
