// Type tests: tsc checks this file in pnpm typecheck.
import { describe, expect, it } from "vitest";
import type { HeroSection, SectionEditors, SectionRenderers, Sections } from "../../sections";

type Equivalent<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const assertTrue = <T extends true>(value: T) => value;

type App = Sections<{ hero: { backgroundImageId: string | null }; feed: { availability: "all" | "inStock" } }, "orders">;
type Plain = Sections;

describe("section types", () => {
  it("add an app's fields and live sources to the shared types", () => {
    assertTrue<Equivalent<Extract<App, { type: "hero" }>, HeroSection & { backgroundImageId: string | null }>>(true);
    assertTrue<Equivalent<Extract<App, { type: "feed" }>["availability"], "all" | "inStock">>(true);
    assertTrue<Equivalent<Extract<App, { type: "stats" }>["items"][number]["source"], "static" | "orders">>(true);
    assertTrue<Equivalent<Extract<Plain, { type: "stats" }>["items"][number]["source"], "static">>(true);
    assertTrue<Equivalent<App["type"], Plain["type"]>>(true);
    expect(true).toBe(true);
  });

  it("reject what the app's union rejects", () => {
    // @ts-expect-error the app's hero needs backgroundImageId.
    const hero: App = { id: "h", type: "hero", visible: true, heading: "", subheading: "", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "" };
    // @ts-expect-error the app's feed needs availability.
    const feed: App = { id: "f", type: "feed", visible: true, heading: "", limit: 1 };
    // @ts-expect-error the plain union has no live sources.
    const stats: Plain = { id: "s", type: "stats", visible: true, heading: "", items: [{ source: "orders", value: "", label: "" }] };
    // @ts-expect-error there is no banner type.
    const banner: Plain = { id: "b", type: "banner", visible: true };
    expect([hero, feed, stats, banner]).toHaveLength(4);
  });

  it("type each registered renderer and editor by its section", () => {
    const renderers: SectionRenderers<App> = {
      hero: section => section.backgroundImageId,
      feed: section => section.availability,
      // @ts-expect-error a feature has no availability.
      feature: section => section.availability,
    };
    const editors: SectionEditors<Plain> = {};
    expect(Object.keys(renderers)).toHaveLength(3);
    expect(editors).toEqual({});
  });
});
