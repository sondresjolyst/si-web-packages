import { describe, expect, it } from "vitest";
import { defaultPasswordStrings, passwordSchema } from "../../validation";

const messagesFor = (password: string, schema = passwordSchema()) => {
  const result = schema.safeParse(password);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("passwordSchema", () => {
  it("accepts a password that meets every rule, without a symbol", () => {
    expect(messagesFor("Password1")).toEqual([]);
  });

  it("names each rule a password breaks", () => {
    expect(messagesFor("pass")).toEqual([
      defaultPasswordStrings.tooShort,
      defaultPasswordStrings.uppercase,
      defaultPasswordStrings.digit,
    ]);
  });

  it("needs a lowercase letter", () => {
    expect(messagesFor("PASSWORD1!")).toEqual([defaultPasswordStrings.lowercase]);
  });

  it("needs an uppercase letter", () => {
    expect(messagesFor("password1")).toEqual([defaultPasswordStrings.uppercase]);
  });

  it("needs a digit", () => {
    expect(messagesFor("Password")).toEqual([defaultPasswordStrings.digit]);
  });

  it("counts only ASCII letters and digits, as Identity does", () => {
    expect(messagesFor("Ålesund1")).toEqual([defaultPasswordStrings.uppercase]);
    expect(messagesFor("ÆØÅæøå12")).toEqual([defaultPasswordStrings.lowercase, defaultPasswordStrings.uppercase]);
    expect(messagesFor("Passord١")).toEqual([defaultPasswordStrings.digit]);
    expect(messagesFor("Ålesund1a")).toEqual([defaultPasswordStrings.uppercase]);
    expect(messagesFor("ÅlesundA1")).toEqual([]);
  });

  it("needs at least 8 characters and sets no upper limit", () => {
    expect(messagesFor("Aa1aaaa")).toEqual([defaultPasswordStrings.tooShort]);
    expect(messagesFor("Aa1aaaaa")).toEqual([]);
    expect(messagesFor(`Aa1${"a".repeat(500)}`)).toEqual([]);
  });

  it("uses the messages it is given, and the defaults for any left out", () => {
    const schema = passwordSchema({ uppercase: "Ta med en stor bokstav.", digit: undefined });

    expect(messagesFor("password", schema)).toEqual(["Ta med en stor bokstav.", defaultPasswordStrings.digit]);
  });
});
