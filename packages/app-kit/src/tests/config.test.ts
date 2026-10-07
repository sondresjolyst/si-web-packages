import { describe, expect, it } from "vitest";
import { defineSessionConfig, resolveJwtSecret } from "../config";

const config = defineSessionConfig({
  jwtSecretEnvVar: "API_JWT_SECRET",
  loginRoute: "/en/login",
  draftStoragePrefix: "example",
});

describe("defineSessionConfig", () => {
  it("rejects a draft prefix that would orphan the drafts already saved", () => {
    for (const draftStoragePrefix of ["example:draft:", "example:", ""]) {
      expect(() => defineSessionConfig({ ...config, draftStoragePrefix })).toThrow("bare name");
    }
  });
});

describe("resolveJwtSecret", () => {
  it("reads the variable named by the config", () => {
    expect(resolveJwtSecret(config, { API_JWT_SECRET: "s3cret" })).toBe("s3cret");
  });

  it("names the missing variable when it is unset", () => {
    expect(() => resolveJwtSecret(config, {})).toThrow("API_JWT_SECRET");
  });

  it("treats an empty value as missing", () => {
    expect(() => resolveJwtSecret(config, { API_JWT_SECRET: "" })).toThrow();
  });
});
