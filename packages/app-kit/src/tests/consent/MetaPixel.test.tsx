import { act, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConsentBanner, ConsentSettingsLink, isValidPixelId, META_PIXEL_SCRIPT_SRC, MetaPixel, setConsent, trackPixel } from "../../consent";
import { CONSENT_STORAGE_KEY, getConsent } from "../../consent";
import { resetConsentStore } from "../../consent/consentStore";
import { clearPixelCookies, startPixel, stopPixel } from "../../consent/pixel";
import { navigation } from "../../testing";

vi.mock("next/navigation", async () => (await import("../../testing")).nextNavigationMock());

const CID = "6f1c1f9e-1c2d-4e5f-8a9b-0c1d2e3f4a5b";
const RECENT = new Date().toISOString();
const ID = "123456789012345";
type Fbq = ((...args: unknown[]) => void) & { queue: unknown[][] };
const pixelWindow = () => window as Window & { fbq?: Fbq; _fbq?: Fbq };
const scripts = () => document.querySelectorAll(`script[src="${META_PIXEL_SCRIPT_SRC}"]`);
const calls = () => pixelWindow().fbq?.queue ?? [];
const pageViews = () => calls().filter(c => c[0] === "track" && c[1] === "PageView");

function App({ pixelId = ID, noticeVersion, maxAgeDays }: { pixelId?: string | null | undefined; noticeVersion?: string; maxAgeDays?: number }) {
  return (
    <>
      <MetaPixel pixelId={pixelId} noticeVersion={noticeVersion} maxAgeDays={maxAgeDays} />
      <ConsentBanner enabled cookiesHref="/cookies" noticeVersion={noticeVersion} maxAgeDays={maxAgeDays} />
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
  for (const name of ["_fbp", "_fbc", "own"]) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
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
    expect(calls()).toEqual([["consent", "grant"], ["set", "autoConfig", false, ID], ["init", ID], ["track", "PageView"]]);
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

  it("tracks no PageView of its own on a client navigation, which fbevents.js counts itself", () => {
    setConsent({ marketing: true });
    const { rerender } = render(<App />);
    expect(pageViews()).toHaveLength(1);

    navigation.pathname = "/products";
    rerender(<App />);
    navigation.pathname = "/checkout";
    rerender(<App />);
    expect(pageViews()).toHaveLength(1);
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

  it("grants again on a new accept without a second script or init, and counts the page it happens on", async () => {
    setConsent({ marketing: false });
    setConsent({ marketing: true });
    render(<App />);
    act(() => setConsent({ marketing: false }));
    act(() => setConsent({ marketing: true }));

    expect(scripts()).toHaveLength(1);
    expect(calls().filter(c => c[0] === "consent")).toEqual([["consent", "grant"], ["consent", "revoke"], ["consent", "grant"]]);
    expect(calls().filter(c => c[0] === "init")).toHaveLength(1);
    expect(pageViews()).toHaveLength(2);
  });

  it("sends one PageView for a new grant after a withdrawal, on the page it happens on", async () => {
    setConsent({ marketing: true });
    const { rerender } = render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    navigation.pathname = "/after";
    rerender(<App />);
    expect(pageViews()).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(pageViews()).toHaveLength(2);
    navigation.pathname = "/later";
    rerender(<App />);
    expect(pageViews()).toHaveLength(2);
  });

  it("tracks under a notice version, and stops when another tab chooses under another one", async () => {
    render(<App noticeVersion="n1" />);
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    trackPixel("Purchase", { value: 1 }, { eventID: "A1" });
    expect(calls().at(-1)).toEqual(["track", "Purchase", { value: 1 }, { eventID: "A1" }]);

    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ consentId: CID, marketing: true, version: 1, decidedAt: RECENT, noticeVersion: "n2" }),
    );
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_STORAGE_KEY })));
    expect(calls().at(-1)).toEqual(["consent", "revoke"]);
    expect(screen.getByRole("region")).toBeInTheDocument();

    const before = calls().length;
    trackPixel("Purchase", { value: 1 }, { eventID: "A2" });
    expect(calls()).toHaveLength(before);
  });

  describe("a choice that expires in an open tab", () => {
    const DAY = 24 * 60 * 60 * 1000;
    const start = new Date("2026-10-24T12:00:00Z");
    const later = () => vi.setSystemTime(new Date(start.getTime() + 2 * DAY));

    beforeEach(() => {
      vi.useFakeTimers({ now: start, toFake: ["Date"] });
      setConsent({ marketing: true });
    });

    afterEach(() => vi.useRealTimers());

    const expired = () => {
      expect(calls().at(-1)).toEqual(["consent", "revoke"]);
      expect(screen.getByRole("region")).toBeInTheDocument();
    };

    it.each([
      ["the window gets focus", () => window.dispatchEvent(new Event("focus"))],
      ["the page becomes visible", () => document.dispatchEvent(new Event("visibilitychange"))],
    ])("turns the pixel off and asks again when %s", (_name, event) => {
      render(<App maxAgeDays={1} />);
      expect(scripts()).toHaveLength(1);
      later();
      act(event);
      expired();
    });

    it("turns the pixel off on the next navigation, with no PageView for it", () => {
      const { rerender } = render(<App maxAgeDays={1} />);
      later();
      navigation.pathname = "/later";
      rerender(<App maxAgeDays={1} />);
      expired();
      expect(pageViews()).toHaveLength(1);
    });

    it("stops a custom event the moment the choice expires, before any recheck", () => {
      render(<App maxAgeDays={1} />);
      trackPixel("Lead");
      expect(calls().at(-1)).toEqual(["track", "Lead"]);
      later();
      const before = calls().length;
      trackPixel("Lead");
      expect(calls()).toHaveLength(before);
    });
  });

  it("stops a custom event when the stored choice is for another notice, before any recheck", async () => {
    render(<App noticeVersion="n1" />);
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ consentId: CID, marketing: true, version: 1, decidedAt: RECENT, noticeVersion: "n2" }),
    );
    resetConsentStore();
    const before = calls().length;
    trackPixel("Lead");
    expect(calls()).toHaveLength(before);
  });

  it("keeps the first rules for the page and ignores a mount with other ones", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<App noticeVersion="n1" />);
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    render(<MetaPixel pixelId={ID} noticeVersion="n2" />);
    render(<MetaPixel pixelId={ID} noticeVersion="n1" maxAgeDays={30} />);

    // The n2 mount has no consent under its own rules, so it never tries to start. The n1 mount with
    // another maxAgeDays does, and is turned away with a warning.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(calls().filter(c => c[0] === "consent")).toEqual([["consent", "grant"]]);
    trackPixel("Lead");
    expect(calls().at(-1)).toEqual(["track", "Lead"]);
  });

  it("keeps the first rules when a mount's rules change, until the page reloads", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { rerender } = render(<App noticeVersion="n1" />);
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    rerender(<App noticeVersion="n2" />);
    expect(calls().at(-1)).not.toEqual(["consent", "revoke"]);
    const before = calls().length;
    trackPixel("Lead");
    expect(calls()).toHaveLength(before);
  });

  it("counts StrictMode's double effects as one mount", () => {
    setConsent({ marketing: true });
    const { unmount } = render(
      <StrictMode>
        <MetaPixel pixelId={ID} />
      </StrictMode>,
    );
    trackPixel("Lead");
    expect(calls().at(-1)).toEqual(["track", "Lead"]);
    unmount();
    const before = calls().length;
    trackPixel("Lead");
    expect(calls()).toHaveLength(before);
  });

  it("keeps a consenting visitor's _fbp through a remount", () => {
    setConsent({ marketing: true });
    document.cookie = "_fbp=fb.1.123; path=/";
    const first = render(<MetaPixel pixelId={ID} />);
    first.unmount();
    render(<MetaPixel pixelId={ID} />);
    expect(document.cookie).toContain("_fbp=fb.1.123");
    expect(calls().filter(c => c[0] === "consent")).toEqual([["consent", "grant"], ["consent", "grant"]]);
    trackPixel("Lead");
    expect(calls().at(-1)).toEqual(["track", "Lead"]);
  });

  it("lets go of its own start even after window.fbq was replaced", () => {
    setConsent({ marketing: true });
    const { unmount } = render(<MetaPixel pixelId={ID} />);
    const original = pixelWindow().fbq!;
    pixelWindow().fbq = (() => {}) as unknown as Fbq;
    unmount();
    pixelWindow().fbq = original;
    const before = calls().length;
    trackPixel("Lead");
    expect(calls()).toHaveLength(before);
  });

  it("does not let a release from before a stop let go of a later start", () => {
    setConsent({ marketing: true });
    const old = startPixel(ID)!;
    stopPixel();
    startPixel(ID);
    old();
    trackPixel("Lead");
    expect(calls().at(-1)).toEqual(["track", "Lead"]);
  });

  it("refuses a direct start with another ID or other rules", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    setConsent({ marketing: true });
    expect(startPixel(ID)).toBeTypeOf("function");
    expect(startPixel("999")).toBeUndefined();
    expect(startPixel(ID, { maxAgeDays: 30 })).toBeUndefined();
    expect(calls().filter(c => c[0] === "init")).toEqual([["init", ID]]);
    expect(calls().filter(c => c[0] === "consent")).toHaveLength(1);
  });

  it("treats a left-out maxAgeDays as the default of 365", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setConsent({ marketing: true });
    render(<MetaPixel pixelId={ID} />);
    render(<MetaPixel pixelId={ID} maxAgeDays={365} />);
    expect(warn).not.toHaveBeenCalled();
  });

  it("turns off automatic events before init, and leaves fbevents' own history PageViews on", () => {
    let atInstall: { disablePushState?: boolean | undefined; queued: number } | undefined;
    let installed: Fbq | undefined;
    Object.defineProperty(window, "fbq", {
      configurable: true,
      get: () => installed,
      set: (value: Fbq & { disablePushState?: boolean }) => {
        installed = value;
        atInstall ??= { disablePushState: value.disablePushState, queued: value.queue.length };
      },
    });
    try {
      setConsent({ marketing: true });
      render(<MetaPixel pixelId={ID} />);
      // Real fbevents.js drops a second hand-tracked PageView in one page load, so it has to count
      // client navigations itself.
      expect(atInstall).toEqual({ disablePushState: undefined, queued: 0 });
      const queue = calls();
      const autoConfig = queue.findIndex(c => c[0] === "set" && c[1] === "autoConfig");
      expect(queue[autoConfig]).toEqual(["set", "autoConfig", false, ID]);
      expect(autoConfig).toBeLessThan(queue.findIndex(c => c[0] === "init"));
    } finally {
      delete (window as { fbq?: unknown }).fbq;
    }
  });

  it("withdraws from a mount with other rules too, under the page's rules", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const first = render(<App noticeVersion="n1" />);
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    render(<MetaPixel pixelId={ID} noticeVersion="n2" />);
    first.unmount();
    document.cookie = "_fbp=fb.1.123; path=/";

    act(() => setConsent({ marketing: false, noticeVersion: "n1" }));
    expect(calls().at(-1)).toEqual(["consent", "revoke"]);
    expect(document.cookie).not.toContain("_fbp");
  });

  it("revokes again after a new grant", () => {
    setConsent({ marketing: true });
    render(<App />);
    act(() => setConsent({ marketing: false }));
    act(() => setConsent({ marketing: true }));
    act(() => setConsent({ marketing: false }));
    expect(calls().filter(c => c[0] === "consent").map(c => c[1])).toEqual(["grant", "revoke", "grant", "revoke"]);
  });

  it("revokes once, however often a withdrawn page rechecks", () => {
    setConsent({ marketing: true });
    render(<App />);
    act(() => setConsent({ marketing: false }));
    act(() => window.dispatchEvent(new Event("focus")));
    act(() => window.dispatchEvent(new Event("focus")));
    expect(calls().filter(c => c[0] === "consent")).toEqual([["consent", "grant"], ["consent", "revoke"]]);
  });

  it("tells whether trackPixel handed the event to fbq", () => {
    expect(trackPixel("Purchase")).toBe(false);
    setConsent({ marketing: true });
    expect(trackPixel("Purchase")).toBe(false);
    const { unmount } = render(<MetaPixel pixelId={ID} />);
    expect(trackPixel("Purchase", { value: 1 }, { eventID: "O1" })).toBe(true);
    expect(calls().at(-1)).toEqual(["track", "Purchase", { value: 1 }, { eventID: "O1" }]);

    unmount();
    expect(trackPixel("Purchase")).toBe(false);
    render(<MetaPixel pixelId={ID} />);
    expect(trackPixel("Purchase")).toBe(true);
    act(() => setConsent({ marketing: false }));
    expect(trackPixel("Purchase")).toBe(false);
  });

  it("lets go of a start only once", () => {
    setConsent({ marketing: true });
    startPixel(ID);
    const second = startPixel(ID)!;
    second();
    second();
    trackPixel("Lead");
    expect(calls().at(-1)).toEqual(["track", "Lead"]);
  });

  it("sends one PageView per start, not per mount or remount", () => {
    setConsent({ marketing: true });
    const first = startPixel(ID)!;
    startPixel(ID);
    first();
    startPixel(ID);
    expect(pageViews()).toHaveLength(1);
    stopPixel();
    startPixel(ID);
    startPixel(ID);
    expect(pageViews()).toHaveLength(2);
  });

  it("sends nothing after stopPixel while consent still holds", () => {
    setConsent({ marketing: true });
    render(<MetaPixel pixelId={ID} />);
    trackPixel("Lead");
    expect(calls().at(-1)).toEqual(["track", "Lead"]);

    act(() => stopPixel());
    const before = calls().length;
    trackPixel("Lead");
    expect(calls()).toHaveLength(before);
    expect(getConsent().marketing).toBe(true);
  });

  it("sends nothing once MetaPixel unmounts or loses its ID, while consent still holds", () => {
    setConsent({ marketing: true });
    const { rerender, unmount } = render(<MetaPixel pixelId={ID} />);
    rerender(<MetaPixel pixelId={null} />);
    let before = calls().length;
    trackPixel("Lead");
    expect(calls()).toHaveLength(before);

    rerender(<MetaPixel pixelId={ID} />);
    trackPixel("Lead");
    expect(calls().at(-1)).toEqual(["track", "Lead"]);

    unmount();
    before = calls().length;
    trackPixel("Lead");
    expect(calls()).toHaveLength(before);
  });

  it("keeps sending while another MetaPixel still runs the pixel", () => {
    setConsent({ marketing: true });
    const both = (second: boolean) => (
      <>
        <MetaPixel pixelId={ID} />
        {second && <MetaPixel pixelId={ID} />}
      </>
    );
    const { rerender } = render(both(true));
    rerender(both(false));
    trackPixel("Lead");
    expect(calls().at(-1)).toEqual(["track", "Lead"]);
  });

  it("sends one PageView from two mounts", () => {
    setConsent({ marketing: true });
    const twice = () => (
      <>
        <MetaPixel pixelId={ID} />
        <MetaPixel pixelId={ID} />
      </>
    );
    const { rerender } = render(twice());
    expect(scripts()).toHaveLength(1);
    expect(calls().filter(c => c[0] === "init")).toHaveLength(1);
    expect(pageViews()).toHaveLength(1);

    navigation.pathname = "/products";
    rerender(twice());
    expect(pageViews()).toHaveLength(1);
  });

  it("keeps the first pixel ID for the page and warns about another in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setConsent({ marketing: true });
    const { rerender } = render(<MetaPixel pixelId={ID} />);
    rerender(<MetaPixel pixelId="999" />);
    navigation.pathname = "/products";
    rerender(<MetaPixel pixelId="999" />);

    expect(calls().filter(c => c[0] === "init")).toEqual([["init", ID]]);
    expect(calls().filter(c => c[0] === "consent")).toEqual([["consent", "grant"]]);
    expect(pageViews()).toHaveLength(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain("999");
  });

  it("ignores another pixel ID without a warning in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setConsent({ marketing: true });
    const { rerender } = render(<MetaPixel pixelId={ID} />);
    rerender(<MetaPixel pixelId="999" />);
    expect(calls().filter(c => c[0] === "init")).toEqual([["init", ID]]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("starts when another tab records consent", () => {
    render(<App />);
    expect(scripts()).toHaveLength(0);

    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ consentId: CID, marketing: true, version: 1, decidedAt: RECENT }));
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_STORAGE_KEY })));
    expect(scripts()).toHaveLength(1);
    expect(pageViews()).toHaveLength(1);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("removes old Meta cookies without consent, even when the pixel never loaded", () => {
    document.cookie = "_fbp=fb.1.123; path=/";
    document.cookie = "_fbc=fb.1.456; path=/";
    document.cookie = "own=1; path=/";
    setConsent({ marketing: false });
    render(<MetaPixel pixelId={ID} />);

    expect(document.cookie).not.toMatch(/_fbp|_fbc/);
    expect(document.cookie).toContain("own=1");
    expect(pixelWindow().fbq).toBeUndefined();
    expect(scripts()).toHaveLength(0);
  });

  it("keeps a consenting visitor's cookies while the page hydrates", async () => {
    setConsent({ marketing: true });
    document.cookie = "_fbp=fb.1.123; path=/";
    const container = document.createElement("div");
    container.innerHTML = renderToString(<MetaPixel pixelId={ID} />);
    document.body.appendChild(container);
    await act(async () => {
      hydrateRoot(container, <MetaPixel pixelId={ID} />);
    });
    expect(document.cookie).toContain("_fbp=fb.1.123");
    expect(scripts()).toHaveLength(1);
    container.remove();
  });

  it("removes the cookies on the host and each parent domain", () => {
    const writes: string[] = [];
    vi.spyOn(Document.prototype, "cookie", "set").mockImplementation(value => {
      writes.push(value);
    });
    clearPixelCookies("www.example.co.uk");
    const expired = "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    expect(writes).toEqual(
      ["_fbp", "_fbc"].flatMap(name => [
        `${name}${expired}`,
        `${name}${expired}; domain=.www.example.co.uk`,
        `${name}${expired}; domain=.example.co.uk`,
        `${name}${expired}; domain=.co.uk`,
      ]),
    );
  });

  it("loads nothing for a stored acceptance of another record version", () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ consentId: CID, marketing: true, version: 2, decidedAt: RECENT }));
    render(<App />);
    expect(scripts()).toHaveLength(0);
    expect(screen.getByRole("region")).toBeInTheDocument();
  });

  it("asks again when the notice version changed, and stores the new one", async () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ consentId: CID, marketing: true, version: 1, decidedAt: RECENT, noticeVersion: "2026-01" }),
    );
    render(<App noticeVersion="2026-10" />);
    expect(scripts()).toHaveLength(0);
    expect(pixelWindow().fbq).toBeUndefined();

    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY)!)).toMatchObject({ marketing: true, noticeVersion: "2026-10" });
    expect(scripts()).toHaveLength(1);
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
