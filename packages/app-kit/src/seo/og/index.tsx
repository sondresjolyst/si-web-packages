import { ImageResponse } from "next/og";
import { SHARE_IMAGE_SIZE } from "../site";

export { SHARE_IMAGE_SIZE };

export interface ShareImageInput {
  name: string;
  tagline: string;
  /**
   * Colours as literals. The image renders outside the browser, so it cannot read CSS custom
   * properties. `primary` is the bar above the name.
   */
  colors: { background: string; foreground: string; primary: string };
}

/**
 * The default share preview: the name, a bar in the brand colour and the tagline. Return it from a
 * route such as `[locale]/og/route.tsx`, which `pageMetadata` points at. A route, not the
 * `opengraph-image` file convention, since a page's own `openGraph` block replaces that image.
 */
export function shareImage({ name, tagline, colors }: ShareImageInput): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: colors.background,
          color: colors.foreground,
        }}
      >
        <div style={{ display: "flex", width: 120, height: 12, background: colors.primary }} />
        <div style={{ marginTop: 48, fontSize: 96, fontWeight: 800, letterSpacing: "-0.03em" }}>{name}</div>
        <div style={{ marginTop: 24, fontSize: 34, lineHeight: 1.3, color: "rgba(255,255,255,0.75)" }}>{tagline}</div>
      </div>
    ),
    SHARE_IMAGE_SIZE,
  );
}
