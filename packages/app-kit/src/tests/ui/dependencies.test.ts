import { describe, expect, it } from "vitest";
import { packagesImportedBy } from "../importGraph";

describe("the ui entry point", () => {
  it("reads the API's error codes without axios or next-auth, so a site without sign-in can use it", () => {
    const packages = packagesImportedBy("ui/index.ts");

    expect(packages).not.toContain("axios");
    expect(packages).not.toContain("next-auth");
  });
});
