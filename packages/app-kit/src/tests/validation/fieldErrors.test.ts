import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { zodFieldErrors } from "../../validation";

const schema = z
  .object({
    email: z.string().email("Not an email."),
    name: z.string().min(1, "Required.").max(5, "Too long."),
    password: z.string().min(8, "Too short.").regex(/\d/, "Needs a digit."),
  })
  .refine((v) => v.name !== v.email, { message: "Name and email must differ." });

const fail = (value: unknown) => {
  const result = schema.safeParse(value);
  if (result.success) throw new Error("expected a failure");
  return result.error;
};

describe("zodFieldErrors", () => {
  it("gives each field its first message and leaves out fields that pass", () => {
    const errors = zodFieldErrors(fail({ email: "nope", name: "", password: "abc" }));

    expect(errors).toEqual({ email: "Not an email.", name: "Required.", password: "Too short." });
    expectTypeOf(errors).toEqualTypeOf<Partial<Record<"email" | "name" | "password", string>>>();
  });

  it("gives every message with all, in order", () => {
    const errors = zodFieldErrors(fail({ email: "a@b.no", name: "Kari", password: "abc" }), { all: true });

    expect(errors).toEqual({ password: ["Too short.", "Needs a digit."] });
    expectTypeOf(errors).toEqualTypeOf<Partial<Record<"email" | "name" | "password", string[]>>>();
  });

  it("uses the app's own text for each issue", () => {
    const errors = zodFieldErrors(fail({ email: "nope", name: "Kari Nordmann", password: "abc" }), {
      message: (issue) => (issue.code === "too_big" ? "For lang." : issue.code === "invalid_format" ? "Ugyldig e-post." : "Påkrevd."),
    });

    expect(errors).toEqual({ email: "Ugyldig e-post.", name: "For lang.", password: "Påkrevd." });
  });

  it("uses the app's text with all too", () => {
    const errors = zodFieldErrors(fail({ email: "a@b.no", name: "Kari", password: "abc" }), { all: true, message: (i) => i.code });

    expect(errors).toEqual({ password: ["too_small", "invalid_format"] });
  });

  it("leaves out issues that belong to no field", () => {
    expect(zodFieldErrors(fail({ email: "a@b.no", name: "a@b.no", password: "Password1" }))).toEqual({ name: "Too long." });
    expect(zodFieldErrors(z.string().min(2, "Short.").safeParse("a").error!)).toEqual({});
  });

  it("treats fields named like Object properties as plain fields", () => {
    const record = z.record(z.string(), z.string().min(2, "Short."));
    const error = record.safeParse({ constructor: "b", toString: "c" }).error!;

    const first = zodFieldErrors(error) as Record<string, string>;
    const all = zodFieldErrors(error, { all: true }) as Record<string, string[]>;

    expect(Object.keys(first).sort()).toEqual(["constructor", "toString"]);
    expect(first.constructor).toBe("Short.");
    expect(all.toString).toEqual(["Short."]);
    expect(Object.getPrototypeOf(all)).toBe(Object.prototype);
  });

  it("keys nested and array issues by their top-level field", () => {
    const nested = z.object({ address: z.object({ postalCode: z.string().length(4, "Four digits.") }), tags: z.array(z.string().min(1, "Empty tag.")) });
    const error = nested.safeParse({ address: { postalCode: "12" }, tags: ["ok", ""] }).error!;

    expect(zodFieldErrors(error)).toEqual({ address: "Four digits.", tags: "Empty tag." });
  });
});
