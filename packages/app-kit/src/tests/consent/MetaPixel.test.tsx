import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConsentBanner, ConsentSettingsLink, isValidPixelId, META_PIXEL_SCRIPT_SRC, MetaPixel, setConsent, trackPixel } from "../../consent";
import { resetConsentStore } from "../../consent/consentStore";
import { navigation } from "../../testing";

vi.mock("next/navigation", async () => (await import("../../testing")).nextNavigationMock());

const ID = "123456789012345";
type Fbq = ((...args: unknown[]) => void) & { queue: unknown[][] };
const pixelWindow = () => window as Window & { fbq?: Fbq; _fbq?: Fbq };
const scripts = () => document.querySelectorAll(`script[src="${META_PIXEL_SCRIPT_SRC}"]`);
const calls = () => pixelWindow().fbq?.queue ?? [];
const pageViews = () => calls().filter(c => c[0] === "track" && c[1] === "PageView");

function App({ pixelId = ID }: { pixelId?: string | null | undefined }) {
  return (
    <>
      <MetaPixel pixelId={pixelId} />
      <ConsentBanner enabled cookiesHref="/cookies" />
      <ConsentSettingsLink />
    </>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  resetConsentStore();
  delete pixelWindow().fbq;
  delete pixelWindow()._fbq;
  for (const script of document.querySelectorAll("script")) script.remove();
  navigation.pathname = "/";
});

describe("MetaPixel", () => {
  it("loads nothing from Meta before consent", () => {
    render(<App />);
    expect(scripts()).toHaveLength(0);
    expect(pixelWindow().fbq).toBeUndefined();
  });

  it("loads nothing after a rejection", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(scripts()).toHaveLength(0);
    expect(pixelWindow().fbq).toBeUndefined();
  });

  it("loads the script, starts the pixel without user data, and sends one PageView after accept", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));

    expect(scripts()).toHaveLength(1);
    expect((scripts()[0] as HTMLScriptElement).async).toBe(true);
    expect(META_PIXEL_SCRIPT_SRC).toBe("https://connect.facebook.net/en_US/fbevents.js");
    expect(calls()).toEqual([["consent", "grant"], ["init", ID], ["track", "PageView"]]);
    expect(pixelWindow()._fbq).toBe(pixelWindow().fbq);
    expect(document.querySelector("noscript, img")).toBeNull();
  });

  it("starts at once for a visitor who accepted before, with one PageView under StrictMode", () => {
    setConsent({ marketing: true });
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    expect(scripts()).toHaveLength(1);
    expect(calls().filter(c => c[0] === "init")).toEqual([["init", ID]]);
    expect(pageViews()).toHaveLength(1);
  });

  it("sends exactly one PageView per client navigation", () => {
    setConsent({ marketing: true });
    const { rerender } = render(<App />);
    expect(pageViews()).toHaveLength(1);

    navigation.pathname = "/products";
    rerender(<App />);
    expect(pageViews()).toHaveLength(2);

    rerender(<App />);
    expect(pageViews()).toHaveLength(2);

    navigation.pathname = "/checkout";
    rerender(<App />);
    expect(pageViews()).toHaveLength(3);
    expect(scripts()).toHaveLength(1);
  });

  it("revokes on withdrawal, sends nothing more, and clears Meta's cookies", async () => {
    setConsent({ marketing: true });
    const { rerender } = render(<App />);
    document.cookie = "_fbp=fb.1.123; path=/";
    document.cookie = "_fbc=fb.1.456; path=/";
    document.cookie = "own=1; path=/";

    await userEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(calls().at(-1)).toEqual(["consent", "revoke"]);
    expect(document.cookie).not.toMatch(/_fbp|_fbc/);
    expect(document.cookie).toContain("own=1");

    const before = calls().length;
    trackPixel("Purchase", { value: 1, currency: "NOK" }, { eventID: "A1" });
    navigation.pathname = "/after";
    rerender(<App />);
    expect(calls()).toHaveLength(before);
  });

  it("grants again on a new accept without a second script or init", async () => {
    setConsent({ marketing: false });
    setConsent({ marketing: true });
    render(<App />);
    act(() => setConsent({ marketing: false }));
    act(() => setConsent({ marketing: true }));

    expect(scripts()).toHaveLength(1);
    expect(calls().filter(c => c[0] === "consent")).toEqual([["consent", "grant"], ["consent", "revoke"], ["consent", "grant"]]);
    expect(calls().filter(c => c[0] === "init")).toHaveLength(1);
    expect(pageViews()).toHaveLength(1);
  });

  it.each([["abc"], ["12345a"], [" 123"], ["1.5"], [""], [null], [undefined], ["１２３"]])("renders nothing for the pixel ID %j", id => {
    setConsent({ marketing: true });
    const { container } = render(<MetaPixel pixelId={id} />);
    expect(container).toBeEmptyDOMElement();
    expect(scripts()).toHaveLength(0);
    expect(pixelWindow().fbq).toBeUndefined();
  });

  it("renders nothing on the server", () => {
    expect(renderToString(<MetaPixel pixelId={ID} />)).toBe("");
  });
});

describe("isValidPixelId", () => {
  it("takes digits only", () => {
    expect(isValidPixelId(ID)).toBe(true);
    expect(isValidPixelId("1")).toBe(true);
    expect(isValidPixelId("1e5")).toBe(false);
    expect(isValidPixelId("")).toBe(false);
    expect(isValidPixelId(123)).toBe(false);
  });
});

describe("trackPixel", () => {
  it("does nothing when the pixel is not loaded", () => {
    setConsent({ marketing: true });
    expect(() => trackPixel("Purchase", { value: 1 }, { eventID: "A1" })).not.toThrow();
    expect(pixelWindow().fbq).toBeUndefined();
  });

  it("does nothing without consent, even when fbq is there", () => {
    const fbq = vi.fn();
    pixelWindow().fbq = fbq as unknown as Fbq;
    trackPixel("PageView");
    setConsent({ marketing: false });
    trackPixel("PageView");
    expect(fbq).not.toHaveBeenCalled();
  });

  it("sends standard and custom events, with the event ID Meta dedupes on", () => {
    const fbq = vi.fn();
    pixelWindow().fbq = fbq as unknown as Fbq;
    setConsent({ marketing: true });

    trackPixel("Purchase", { content_ids: ["x"], value: 10, currency: "NOK" }, { eventID: "ORDER-1" });
    trackPixel("ViewContent", { content_ids: ["x"] });
    trackPixel("PageView");
    trackPixel("Lead", undefined, { eventID: "L1" });
    trackPixel("ShareBuild", { slug: "x" });

    expect(fbq.mock.calls).toEqual([
      ["track", "Purchase", { content_ids: ["x"], value: 10, currency: "NOK" }, { eventID: "ORDER-1" }],
      ["track", "ViewContent", { content_ids: ["x"] }],
      ["track", "PageView"],
      ["track", "Lead", {}, { eventID: "L1" }],
      ["trackCustom", "ShareBuild", { slug: "x" }],
    ]);
  });
});
