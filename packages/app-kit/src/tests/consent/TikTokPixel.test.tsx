import { act, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConsentBanner,
  ConsentSettingsLink,
  identifyTikTok,
  isValidTikTokPixelId,
  setConsent,
  TIKTOK_PIXEL_SCRIPT_SRC,
  TikTokPixel,
  trackTikTok,
} from "../../consent";
import { CONSENT_STORAGE_KEY, getConsent } from "../../consent";
import { resetConsentStore } from "../../consent/consentStore";
import { clearTikTokPixelCookies, startTikTokPixel, stopTikTokPixel } from "../../consent/tiktok";
import { navigation } from "../../testing";

vi.mock("next/navigation", async () => (await import("../../testing")).nextNavigationMock());

const CID = "6f1c1f9e-1c2d-4e5f-8a9b-0c1d2e3f4a5b";
const RECENT = new Date().toISOString();
const ID = "C4ABCDEFGH1234567890";
type Ttq = unknown[][] & Record<string, unknown> & { _i?: Record<string, unknown[] & { _u?: string }>; _o?: Record<string, unknown> };
const ttWindow = () => window as Window & { ttq?: Ttq; TiktokAnalyticsObject?: string };
const scripts = () => document.querySelectorAll(`script[src^="${TIKTOK_PIXEL_SCRIPT_SRC}"]`);
const calls = (): unknown[][] => [...(ttWindow().ttq ?? [])];
const pages = () => calls().filter(c => c[0] === "page");
const consentCalls = () => calls().filter(c => /Consent$/.test(String(c[0]))).map(c => c[0]);
const COOKIES = ["_ttp", "ttclid", "ttcsid", "ttcsid_ABC", "own"];

function App({ pixelId = ID, noticeVersion, maxAgeDays }: { pixelId?: string | null | undefined; noticeVersion?: string; maxAgeDays?: number }) {
  return (
    <>
      <TikTokPixel pixelId={pixelId} noticeVersion={noticeVersion} maxAgeDays={maxAgeDays} />
      <ConsentBanner enabled cookiesHref="/cookies" noticeVersion={noticeVersion} maxAgeDays={maxAgeDays} />
      <ConsentSettingsLink />
    </>
  );
}

function setTikTokCookies() {
  document.cookie = "_ttp=abc; path=/";
  document.cookie = "ttclid=def; path=/";
  document.cookie = "ttcsid=1; path=/";
  document.cookie = "ttcsid_ABC=2; path=/";
  document.cookie = "own=1; path=/";
}

beforeEach(() => {
  window.localStorage.clear();
  resetConsentStore();
  delete ttWindow().ttq;
  delete ttWindow().TiktokAnalyticsObject;
  for (const script of document.querySelectorAll("script")) script.remove();
  navigation.pathname = "/";
  for (const name of COOKIES) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("TikTokPixel", () => {
  it("loads nothing from TikTok before consent", () => {
    render(<App />);
    expect(scripts()).toHaveLength(0);
    expect(ttWindow().ttq).toBeUndefined();
  });

  it("loads nothing after a rejection", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(scripts()).toHaveLength(0);
    expect(ttWindow().ttq).toBeUndefined();
  });

  it("holds consent before load, then grants and sends one page view after accept", async () => {
    let atLoad: unknown[][] | undefined;
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string, options?: ElementCreationOptions) => {
      if (tag === "script") atLoad ??= calls();
      return createElement(tag, options);
    });
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));

    expect(atLoad).toEqual([["holdConsent"]]);
    expect(scripts()).toHaveLength(1);
    const script = scripts()[0] as HTMLScriptElement;
    expect(script.async).toBe(true);
    expect(script.src).toBe(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${ID}&lib=ttq`);
    expect(calls()).toEqual([["holdConsent"], ["grantConsent"], ["page"]]);
    expect(ttWindow().TiktokAnalyticsObject).toBe("ttq");
    expect(ttWindow().ttq!._i![ID]!._u).toBe(TIKTOK_PIXEL_SCRIPT_SRC);
    expect(ttWindow().ttq!._o![ID]).toEqual({});
    expect(ttWindow().ttq!.methods).toEqual(expect.arrayContaining(["holdConsent", "revokeConsent", "grantConsent"]));
  });

  it("adds the script before the page's first script, as the base code does", () => {
    const first = document.createElement("script");
    document.body.appendChild(first);
    setConsent({ marketing: true });
    render(<TikTokPixel pixelId={ID} />);
    expect(scripts()[0]!.nextSibling).toBe(first);
  });

  it("starts at once for a visitor who accepted before, with one load and one page view under StrictMode", () => {
    setConsent({ marketing: true });
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    expect(scripts()).toHaveLength(1);
    expect(calls().filter(c => c[0] === "holdConsent")).toHaveLength(1);
    expect(pages()).toHaveLength(1);
  });

  it("sends no page view of its own on a client navigation", () => {
    setConsent({ marketing: true });
    const { rerender } = render(<App />);
    navigation.pathname = "/products";
    rerender(<App />);
    navigation.pathname = "/checkout";
    rerender(<App />);
    expect(pages()).toHaveLength(1);
    expect(scripts()).toHaveLength(1);
  });

  it("revokes on withdrawal, sends nothing more, and clears TikTok's cookies", async () => {
    setConsent({ marketing: true });
    const { rerender } = render(<App />);
    setTikTokCookies();

    await userEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(calls().at(-1)).toEqual(["revokeConsent"]);
    expect(document.cookie).not.toMatch(/_ttp|ttclid|ttcsid/);
    expect(document.cookie).toContain("own=1");

    const before = calls().length;
    expect(trackTikTok("Purchase", { value: 1, currency: "NOK" }, { eventId: "A1" })).toBe(false);
    expect(identifyTikTok({ email: "a@b.no" })).toBe(false);
    navigation.pathname = "/after";
    rerender(<App />);
    expect(calls()).toHaveLength(before);
  });

  it("removes the cookies on the host and each parent domain, ttcsid_ ones included", () => {
    document.cookie = "ttcsid_ABC=2; path=/";
    const writes: string[] = [];
    vi.spyOn(Document.prototype, "cookie", "set").mockImplementation(value => {
      writes.push(value);
    });
    clearTikTokPixelCookies("www.example.co.uk");
    const expired = "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    expect(writes).toEqual(
      ["_ttp", "ttclid", "ttcsid", "ttcsid_ABC"].flatMap(name => [
        `${name}${expired}`,
        `${name}${expired}; domain=.www.example.co.uk`,
        `${name}${expired}; domain=.example.co.uk`,
        `${name}${expired}; domain=.co.uk`,
      ]),
    );
  });

  it("removes old TikTok cookies without consent, even when the pixel never loaded", () => {
    setTikTokCookies();
    setConsent({ marketing: false });
    render(<TikTokPixel pixelId={ID} />);
    expect(document.cookie).not.toMatch(/_ttp|ttclid|ttcsid/);
    expect(document.cookie).toContain("own=1");
    expect(ttWindow().ttq).toBeUndefined();
    expect(scripts()).toHaveLength(0);
  });

  it("grants again on a new accept without a second script or load, and counts the page it happens on", () => {
    setConsent({ marketing: true });
    render(<App />);
    act(() => setConsent({ marketing: false }));
    act(() => setConsent({ marketing: true }));

    expect(scripts()).toHaveLength(1);
    expect(consentCalls()).toEqual(["holdConsent", "grantConsent", "revokeConsent", "grantConsent"]);
    expect(pages()).toHaveLength(2);
  });

  it("revokes once, however often a withdrawn page rechecks", () => {
    setConsent({ marketing: true });
    render(<App />);
    act(() => setConsent({ marketing: false }));
    act(() => window.dispatchEvent(new Event("focus")));
    act(() => window.dispatchEvent(new Event("focus")));
    expect(consentCalls()).toEqual(["holdConsent", "grantConsent", "revokeConsent"]);
  });

  it("stops when another tab chooses under another notice version", async () => {
    render(<App noticeVersion="n1" />);
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(trackTikTok("Lead")).toBe(true);

    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ consentId: CID, marketing: true, version: 1, decidedAt: RECENT, noticeVersion: "n2" }),
    );
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_STORAGE_KEY })));
    expect(calls().at(-1)).toEqual(["revokeConsent"]);
    expect(trackTikTok("Lead")).toBe(false);
  });

  it("counts StrictMode's double effects as one mount", async () => {
    setConsent({ marketing: true });
    const { unmount } = render(
      <StrictMode>
        <TikTokPixel pixelId={ID} />
      </StrictMode>,
    );
    await act(async () => {});
    expect(consentCalls()).toEqual(["holdConsent", "grantConsent", "grantConsent"]);
    expect(pages()).toHaveLength(1);
    expect(trackTikTok("Lead")).toBe(true);
    unmount();
    expect(trackTikTok("Lead")).toBe(false);
  });

  it("revokes, keeping the cookies, once the last TikTokPixel goes away, and resumes with one page view", async () => {
    setConsent({ marketing: true });
    document.cookie = "_ttp=abc; path=/";
    const { unmount } = render(<TikTokPixel pixelId={ID} />);
    unmount();
    await act(async () => {});
    expect(calls().at(-1)).toEqual(["revokeConsent"]);
    expect(document.cookie).toContain("_ttp=abc");

    render(<TikTokPixel pixelId={ID} />);
    expect(calls().slice(-2)).toEqual([["grantConsent"], ["page"]]);
    expect(pages()).toHaveLength(2);
  });

  it("does not let a release from before a stop let go of a later start", () => {
    setConsent({ marketing: true });
    const old = startTikTokPixel(ID)!;
    stopTikTokPixel();
    startTikTokPixel(ID);
    old();
    expect(trackTikTok("Lead")).toBe(true);
  });

  it("does not revoke twice after a stop", async () => {
    setConsent({ marketing: true });
    const release = startTikTokPixel(ID)!;
    stopTikTokPixel();
    release();
    await act(async () => {});
    expect(consentCalls()).toEqual(["holdConsent", "grantConsent", "revokeConsent"]);
  });

  it("sends nothing after stopTikTokPixel while consent still holds", () => {
    setConsent({ marketing: true });
    render(<TikTokPixel pixelId={ID} />);
    act(() => stopTikTokPixel());
    expect(trackTikTok("Lead")).toBe(false);
    expect(getConsent().marketing).toBe(true);
  });

  it("keeps the first pixel ID for the page and warns about another in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setConsent({ marketing: true });
    const { rerender } = render(<TikTokPixel pixelId={ID} />);
    rerender(<TikTokPixel pixelId="D5ZYXWVUTS0987654321" />);

    expect(scripts()).toHaveLength(1);
    expect(Object.keys(ttWindow().ttq!._i!)).toEqual([ID]);
    expect(consentCalls()).toEqual(["holdConsent", "grantConsent"]);
    expect(pages()).toHaveLength(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain("D5ZYXWVUTS0987654321");
  });

  it("refuses a direct start with other rules, and warns nothing in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setConsent({ marketing: true });
    expect(startTikTokPixel(ID)).toBeTypeOf("function");
    expect(startTikTokPixel(ID, { maxAgeDays: 30 })).toBeUndefined();
    expect(startTikTokPixel(ID, { maxAgeDays: 365 })).toBeTypeOf("function");
    expect(warn).not.toHaveBeenCalled();
  });

  it("starts when another tab records consent", () => {
    render(<App />);
    expect(scripts()).toHaveLength(0);
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ consentId: CID, marketing: true, version: 1, decidedAt: RECENT }));
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_STORAGE_KEY })));
    expect(scripts()).toHaveLength(1);
    expect(pages()).toHaveLength(1);
  });

  it("keeps a consenting visitor's cookies while the page hydrates", async () => {
    setConsent({ marketing: true });
    document.cookie = "_ttp=abc; path=/";
    const container = document.createElement("div");
    container.innerHTML = renderToString(<TikTokPixel pixelId={ID} />);
    document.body.appendChild(container);
    await act(async () => {
      hydrateRoot(container, <TikTokPixel pixelId={ID} />);
    });
    expect(document.cookie).toContain("_ttp=abc");
    expect(scripts()).toHaveLength(1);
    container.remove();
  });

  it.each([["abc"], ["c4abcdefgh1234567890"], ["C4ABCDEFG"], ["C".repeat(33)], [" C4ABCDEFGH12"], [""], [null], [undefined]])(
    "renders nothing for the pixel ID %j",
    id => {
      setConsent({ marketing: true });
      const { container } = render(<TikTokPixel pixelId={id} />);
      expect(container).toBeEmptyDOMElement();
      expect(scripts()).toHaveLength(0);
      expect(ttWindow().ttq).toBeUndefined();
    },
  );

  it("renders nothing on the server", () => {
    expect(renderToString(<TikTokPixel pixelId={ID} />)).toBe("");
  });
});

describe("isValidTikTokPixelId", () => {
  it("takes 10 to 32 capital letters and digits", () => {
    expect(isValidTikTokPixelId(ID)).toBe(true);
    expect(isValidTikTokPixelId("ABCDE12345")).toBe(true);
    expect(isValidTikTokPixelId("A".repeat(32))).toBe(true);
    expect(isValidTikTokPixelId("ABCDE1234")).toBe(false);
    expect(isValidTikTokPixelId("A".repeat(33))).toBe(false);
    expect(isValidTikTokPixelId("abcde12345")).toBe(false);
    expect(isValidTikTokPixelId(1234567890)).toBe(false);
  });
});

describe("trackTikTok", () => {
  it("sends nothing on the page before the pixel has loaded", () => {
    setConsent({ marketing: true });
    expect(trackTikTok("Purchase", { value: 1 }, { eventId: "A1" })).toBe(false);
    expect(ttWindow().ttq).toBeUndefined();
  });

  it("sends nothing without consent, even when ttq is there", () => {
    const track = vi.fn();
    ttWindow().ttq = { track } as unknown as Ttq;
    expect(trackTikTok("Purchase")).toBe(false);
    setConsent({ marketing: false });
    expect(trackTikTok("Purchase")).toBe(false);
    expect(track).not.toHaveBeenCalled();
  });

  it("sends nothing with no TikTokPixel holding the pixel, while consent holds", () => {
    setConsent({ marketing: true });
    const { unmount } = render(<TikTokPixel pixelId={ID} />);
    expect(trackTikTok("Lead")).toBe(true);
    unmount();
    const before = calls().length;
    expect(trackTikTok("Lead")).toBe(false);
    expect(calls()).toHaveLength(before);
  });

  it("puts the event ID in the third argument, where TikTok drops duplicates by it", () => {
    setConsent({ marketing: true });
    render(<TikTokPixel pixelId={ID} />);
    const purchase = {
      contents: [{ content_id: "x", content_name: "X", quantity: 2, price: 250 }],
      content_type: "product",
      value: 500,
      currency: "NOK",
    };
    expect(trackTikTok("Purchase", purchase, { eventId: "ORDER-1" })).toBe(true);
    trackTikTok("ViewContent", { content_id: "x" });
    trackTikTok("Lead");
    trackTikTok("Lead", undefined, { eventId: "L1" });
    expect(calls().slice(-4)).toEqual([
      ["track", "Purchase", purchase, { event_id: "ORDER-1" }],
      ["track", "ViewContent", { content_id: "x" }],
      ["track", "Lead"],
      ["track", "Lead", {}, { event_id: "L1" }],
    ]);
  });
});

describe("identifyTikTok", () => {
  it("sends nothing without consent, before load, or with no holder", () => {
    expect(identifyTikTok({ email: "a@b.no" })).toBe(false);
    setConsent({ marketing: true });
    expect(identifyTikTok({ email: "a@b.no" })).toBe(false);
    const { unmount } = render(<TikTokPixel pixelId={ID} />);
    unmount();
    expect(identifyTikTok({ email: "a@b.no" })).toBe(false);
    expect(calls().filter(c => c[0] === "identify")).toHaveLength(0);

    const identify = vi.fn();
    delete ttWindow().ttq;
    ttWindow().ttq = { identify } as unknown as Ttq;
    setConsent({ marketing: false });
    expect(identifyTikTok({ email: "a@b.no" })).toBe(false);
    expect(identify).not.toHaveBeenCalled();
  });

  it("normalizes the email, keeps an E.164 phone, and sends empty strings for the rest, logging nothing", () => {
    const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "info"), vi.spyOn(console, "warn"), vi.spyOn(console, "debug")];
    setConsent({ marketing: true });
    render(<TikTokPixel pixelId={ID} />);

    expect(identifyTikTok({ email: "  Ola.Nordmann@Example.NO ", phoneNumber: "+4712345678", externalId: "u-1" })).toBe(true);
    identifyTikTok({ phoneNumber: "12345678" });
    identifyTikTok({ phoneNumber: "+47 123 45 678" });
    identifyTikTok({});

    expect(calls().filter(c => c[0] === "identify")).toEqual([
      ["identify", { email: "ola.nordmann@example.no", phone_number: "+4712345678", external_id: "u-1" }],
      ["identify", { email: "", phone_number: "", external_id: "" }],
      ["identify", { email: "", phone_number: "", external_id: "" }],
      ["identify", { email: "", phone_number: "", external_id: "" }],
    ]);
    for (const log of logs) expect(log).not.toHaveBeenCalled();
  });
});
