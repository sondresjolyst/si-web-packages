import { describe, expect, it } from "vitest";
import { kroner, parseKroner } from "../../payments";

describe("parseKroner", () => {
  it("reads whole kroner", () => {
    expect(parseKroner("59")).toBe(5900);
    expect(parseKroner("0")).toBe(0);
  });

  it("reads one or two decimals after a comma or a dot", () => {
    expect(parseKroner("59,5")).toBe(5950);
    expect(parseKroner("59.50")).toBe(5950);
    expect(parseKroner("0,07")).toBe(7);
    expect(parseKroner("12500.5")).toBe(1250050);
  });

  it("ignores space around the amount", () => {
    expect(parseKroner("  12 ")).toBe(1200);
  });

  it("gives exact øre where a float product would drift", () => {
    expect(parseKroner("0.29")).toBe(29);
    expect(parseKroner("1.15")).toBe(115);
    expect(parseKroner("4.35")).toBe(435);
  });

  it("refuses anything else", () => {
    for (const typed of ["", " ", "abc", "-5", "1 000", "1,000", "1.234", "5,", ".5", "1,2,3", "5 kr", "1e3"]) {
      expect([typed, parseKroner(typed)]).toEqual([typed, null]);
    }
  });
});

describe("kroner", () => {
  it("writes øre as kroner with a comma and two decimals", () => {
    expect(kroner(37375)).toBe("373,75");
    expect(kroner(5900)).toBe("59,00");
    expect(kroner(7)).toBe("0,07");
    expect(kroner(0)).toBe("0,00");
  });

  it("does not group thousands", () => {
    expect(kroner(123456789)).toBe("1234567,89");
  });

  it("round-trips with parseKroner", () => {
    for (const ore of [0, 1, 29, 435, 5950, 1250050]) expect(parseKroner(kroner(ore))).toBe(ore);
  });
});
