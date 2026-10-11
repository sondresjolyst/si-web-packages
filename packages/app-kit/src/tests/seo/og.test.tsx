// @vitest-environment node
import { describe, expect, it } from "vitest";
import { SHARE_IMAGE_SIZE, shareImage } from "../../seo/og";

describe("shareImage", () => {
  it("renders a PNG at the share image size", async () => {
    const response = shareImage({ name: "Altinnendata", tagline: "Brukte PC-er", colors: { background: "#131313", foreground: "#ffffff", primary: "#00887a" } });
    expect(response.headers.get("content-type")).toBe("image/png");

    const png = new Uint8Array(await response.arrayBuffer());
    expect([...png.slice(1, 4)].map(c => String.fromCharCode(c)).join("")).toBe("PNG");
    const view = new DataView(png.buffer);
    expect({ width: view.getUint32(16), height: view.getUint32(20) }).toEqual(SHARE_IMAGE_SIZE);
  }, 30000);
});
