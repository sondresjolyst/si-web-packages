import { describe, expect, it } from "vitest";
import pkg from "../../package.json";
import { packagesImportedBy } from "./importGraph";

// The entry points whose components draw heroicons. The README's peer list names the same ones.
const heroiconEntries = ["./admin", "./branding", "./payments", "./sections", "./session/react", "./ui"];

const sourceEntries = Object.entries(pkg.exports).flatMap(([name, target]) => {
  const file = typeof target === "string" ? target : target.types;
  return /\.tsx?$/.test(file) ? [[name, file.replace("./src/", "")] as const] : [];
});

describe("@heroicons/react", () => {
  it("is an optional peer, so an app without those components need not install it", () => {
    expect(pkg.peerDependencies["@heroicons/react"]).toBe("^2");
    expect(pkg.peerDependenciesMeta["@heroicons/react"]).toEqual({ optional: true });
  });

  it("is imported only by the entry points the README names", () => {
    const users = sourceEntries.filter(([, file]) => packagesImportedBy(file).has("@heroicons/react")).map(([name]) => name);

    expect(users.sort()).toEqual(heroiconEntries);
  });
});

describe("./company", () => {
  it("imports no package, so a site without axios or next-auth can use it", () => {
    expect(pkg.exports["./company"]).toBe("./src/company/index.ts");
    expect([...packagesImportedBy("company/index.ts")]).toEqual([]);
  });
});

describe("./consent", () => {
  it("imports only React and Next, so any site can ask for consent", () => {
    expect(pkg.exports["./consent"]).toBe("./src/consent/index.ts");
    expect([...packagesImportedBy("consent/index.ts")].sort()).toEqual(["next", "react"]);
  });
});
