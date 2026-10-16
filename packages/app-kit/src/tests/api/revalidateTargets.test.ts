import { afterEach, describe, expect, it, vi } from "vitest";
import { defineRevalidateTargets } from "../../api";

describe("defineRevalidateTargets", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("puts each page under every locale, then the root paths", () => {
    const { targets, paths } = defineRevalidateTargets({
      locales: ["no", "en"],
      targets: {
        builds: { pages: ["", "/builds", "builds/[slug]/"], root: ["/sitemap.xml"] },
        legal: { pages: ["/terms"] },
        branding: {},
      },
    });

    expect(targets).toEqual({ builds: "builds", legal: "legal", branding: "branding" });
    expect(paths).toEqual({
      builds: ["/no", "/no/builds", "/no/builds/[slug]", "/en", "/en/builds", "/en/builds/[slug]", "/sitemap.xml"],
      legal: ["/no/terms", "/en/terms"],
      branding: [],
    });
  });

  it("keeps the paths as they are on a site without locales, with the front page as /", () => {
    const { paths } = defineRevalidateTargets({
      targets: { dynoRuns: { pages: ["/", "", "/dyno-runs", "/dyno-runs/[slug]"], root: ["/sitemap.xml"] } },
    });

    expect(paths.dynoRuns).toEqual(["/", "/", "/dyno-runs", "/dyno-runs/[slug]", "/sitemap.xml"]);
  });

  it("asks the revalidate route to purge one target", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetch);
    const { revalidate } = defineRevalidateTargets({ targets: { legal: { pages: ["/terms"] } } });

    await revalidate("legal");

    expect(fetch).toHaveBeenCalledWith("/api/revalidate", expect.objectContaining({ method: "POST", body: JSON.stringify({ target: "legal" }) }));
  });
});
