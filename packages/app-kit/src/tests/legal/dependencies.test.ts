import { describe, expect, it } from "vitest";
import type { LegalPage as ApiLegalPage } from "../../api";
import type { LegalPage } from "../../legal";
import { packagesImportedBy } from "../importGraph";

describe("the legal entry point", () => {
  it("needs neither axios nor next-auth, so a public site can show legal pages without them", () => {
    const packages = packagesImportedBy("legal/index.ts");

    expect(packages).not.toContain("axios");
    expect(packages).not.toContain("next-auth");
    expect([...packages].sort()).toEqual(["next", "react", "react-markdown", "rehype-sanitize", "remark-gfm"]);
  });

  it("exports the same LegalPage type as the api entry point", () => {
    const page: LegalPage<"terms"> = { key: "terms", locale: "nb", title: "Vilkår", bodyMarkdown: "", updatedAt: "", version: "" };
    const same: ApiLegalPage<"terms"> = page;
    expect(same.key).toBe("terms");
  });
});
