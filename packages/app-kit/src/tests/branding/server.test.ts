// @vitest-environment node
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { brandingIcon, iconVersion } from "../../branding/server";

const dir = mkdtempSync(join(tmpdir(), "branding-"));
const fallbackPath = join(dir, "icon.png");
writeFileSync(fallbackPath, "bundled");
const text = async (response: Response) => new TextDecoder().decode(await response.arrayBuffer());

describe("brandingIcon", () => {
  it("serves the icon set in settings, with its type", async () => {
    const response = await brandingIcon({
      load: async () => ({ iconData: Buffer.from("custom").toString("base64"), iconContentType: "image/x-icon" }),
      fallbackPath,
      fallbackType: "image/png",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/x-icon");
    expect(await text(response)).toBe("custom");
  });

  it.each([null, undefined, {}, { iconData: "abc", iconContentType: null }, { iconData: null, iconContentType: "image/png" }])(
    "serves the bundled icon when none is set (%j)",
    async branding => {
      const response = await brandingIcon({ load: async () => branding, fallbackPath, fallbackType: "image/svg+xml" });
      expect(response.headers.get("content-type")).toBe("image/svg+xml");
      expect(await text(response)).toBe("bundled");
    },
  );

  it.each(["image/svg+xml", "text/html", "application/xhtml+xml", "image/svg"])("serves the bundled icon in place of an upload of type %s", async type => {
    const response = await brandingIcon({
      load: async () => ({ iconData: Buffer.from("<svg onload=alert(1)>").toString("base64"), iconContentType: type }),
      fallbackPath,
      fallbackType: "image/png",
    });
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(await text(response)).toBe("bundled");
  });

  it("serves each raster type, matched without regard to case", async () => {
    for (const type of ["image/png", "image/jpeg", "image/webp", "image/gif", "image/x-icon", "image/vnd.microsoft.icon"]) {
      const response = await brandingIcon({ load: async () => ({ iconData: "QQ==", iconContentType: ` ${type.toUpperCase()} ` }), fallbackPath, fallbackType: "image/svg+xml" });
      expect(response.headers.get("content-type"), type).toBe(type);
    }
  });

  it("keeps a browser from sniffing or running either icon", async () => {
    for (const branding of [{ iconData: "QQ==", iconContentType: "image/png" }, {}]) {
      const response = await brandingIcon({ load: async () => branding, fallbackPath, fallbackType: "image/svg+xml" });
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
    }
  });

  it("serves nothing cacheable when the branding cannot be loaded", async () => {
    const response = await brandingIcon({ load: () => Promise.reject(new TypeError("fetch failed")), fallbackPath, fallbackType: "image/png" });
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await text(response)).toBe("");
  });
});

describe("iconVersion", () => {
  it("is a short digest that changes with the bytes", () => {
    expect(iconVersion("a")).toMatch(/^[0-9a-f]{12}$/);
    expect(iconVersion("a")).toBe(iconVersion(Buffer.from("a")));
    expect(iconVersion("a")).not.toBe(iconVersion("b"));
    expect(iconVersion("a")).toBe("ca978112ca1b");
  });
});
