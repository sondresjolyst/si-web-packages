import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_STORAGE_KEY, CONSENT_VERSION, closeConsentSettings, getConsent, openConsentSettings, setConsent, useConsent } from "../../consent";
import { getServerConsent, getStoredConsent, resetConsentStore, subscribeConsent } from "../../consent/consentStore";

const CID = "6f1c1f9e-1c2d-4e5f-8a9b-0c1d2e3f4a5b";
const RECENT = new Date().toISOString();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const store = (value: unknown) => window.localStorage.setItem(CONSENT_STORAGE_KEY, typeof value === "string" ? value : JSON.stringify(value));
const stored = () => JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? "null");

function Probe() {
  const c = useConsent();
  return <p>{`${c.ready} ${c.marketing} ${c.reopened} ${c.record ? c.record.marketing : "none"}`}</p>;
}

beforeEach(() => {
  window.localStorage.clear();
  resetConsentStore();
});

afterEach(() => vi.restoreAllMocks());

describe("the consent store", () => {
  it("has no choice and no consent when nothing is stored", () => {
    expect(getConsent()).toEqual({ ready: true, record: null, marketing: false, reopened: false });
  });

  it("stores a versioned record with the time of the choice", () => {
    vi.useFakeTimers({ now: new Date("2026-10-24T12:00:00Z"), toFake: ["Date"] });
    setConsent({ marketing: true });
    vi.useRealTimers();

    const record = { consentId: expect.stringMatching(UUID), marketing: true, version: CONSENT_VERSION, decidedAt: "2026-10-24T12:00:00.000Z" };
    expect(CONSENT_STORAGE_KEY).toBe("consent");
    expect(CONSENT_VERSION).toBe(1);
    expect(stored()).toEqual(record);
    expect(getConsent()).toEqual({ ready: true, record, marketing: true, reopened: false });

    setConsent({ marketing: false });
    expect(stored()).toMatchObject({ marketing: false });
    expect(getConsent().marketing).toBe(false);
  });

  it("reads a stored record", () => {
    store({ consentId: CID, marketing: true, version: 1, decidedAt: RECENT });
    expect(getConsent()).toMatchObject({ marketing: true, record: { decidedAt: RECENT } });
  });

  it.each([
    ["another version", { consentId: CID, marketing: true, version: 2, decidedAt: RECENT }],
    ["no version", { consentId: CID, marketing: true, decidedAt: RECENT }],
    ["a string for marketing", { consentId: CID, marketing: "true", version: 1, decidedAt: RECENT }],
    ["no time", { marketing: true, version: 1 }],
    ["null", null],
    ["a number", 1],
    ["broken JSON", "{marketing"],
  ])("counts %s as no choice", (_name, value) => {
    store(value);
    expect(getConsent()).toMatchObject({ record: null, marketing: false });
  });

  it("treats storage it cannot read as no consent", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(getConsent()).toEqual({ ready: true, record: null, marketing: false, reopened: false });
  });

  it("keeps a choice for the page when storage cannot be written", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    setConsent({ marketing: true });
    expect(getConsent().marketing).toBe(true);
  });

  it("reopens, closes on a choice, and tells subscribers once per change", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeConsent(listener);
    setConsent({ marketing: true });
    openConsentSettings();
    openConsentSettings();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getConsent()).toMatchObject({ reopened: true, marketing: true });

    setConsent({ marketing: false });
    expect(getConsent()).toMatchObject({ reopened: false, marketing: false });
    unsubscribe();
    setConsent({ marketing: true });
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("stores the notice version and treats a choice for another one as no choice", () => {
    setConsent({ marketing: true, noticeVersion: "2026-10" });
    expect(stored()).toMatchObject({ marketing: true, version: 1, noticeVersion: "2026-10" });
    expect(getConsent({ noticeVersion: "2026-10" })).toMatchObject({ marketing: true, record: { noticeVersion: "2026-10" } });
    expect(getConsent({ noticeVersion: "2026-11" })).toMatchObject({ ready: true, marketing: false, record: null });
    expect(getConsent()).toMatchObject({ marketing: false, record: null });

    setConsent({ marketing: true });
    expect(stored()).not.toHaveProperty("noticeVersion");
    expect(getConsent()).toMatchObject({ marketing: true });
    expect(getConsent({ noticeVersion: "2026-10" })).toMatchObject({ marketing: false, record: null });
  });

  it("reads a stored notice version, and refuses one that is not a string", () => {
    store({ consentId: CID, marketing: true, version: 1, decidedAt: RECENT, noticeVersion: "a" });
    expect(getConsent({ noticeVersion: "a" }).record).toEqual({ consentId: CID, marketing: true, version: 1, decidedAt: RECENT, noticeVersion: "a" });
    resetConsentStore();
    store({ consentId: CID, marketing: true, version: 1, decidedAt: RECENT, noticeVersion: 2 });
    expect(getStoredConsent().record).toBeNull();
  });

  it("closes a reopened choice and keeps it", () => {
    const listener = vi.fn();
    subscribeConsent(listener);
    closeConsentSettings();
    expect(listener).not.toHaveBeenCalled();
    setConsent({ marketing: true });
    openConsentSettings();
    closeConsentSettings();
    expect(getConsent()).toMatchObject({ reopened: false, marketing: true });
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("is never ready on the server", () => {
    store({ consentId: CID, marketing: true, version: 1, decidedAt: RECENT });
    expect(getServerConsent()).toEqual({ ready: false, record: null, marketing: false, reopened: false });
    expect(renderToString(<Probe />)).toBe("<p>false false false none</p>");
  });
});

describe("useConsent", () => {
  it("reads storage in the browser and follows changes", () => {
    store({ consentId: CID, marketing: true, version: 1, decidedAt: RECENT });
    render(<Probe />);
    expect(screen.getByText("true true false true")).toBeInTheDocument();

    act(() => openConsentSettings());
    expect(screen.getByText("true true true true")).toBeInTheDocument();
    act(() => setConsent({ marketing: false }));
    expect(screen.getByText("true false false false")).toBeInTheDocument();
  });

  it("reads the choice for its notice version", () => {
    store({ consentId: CID, marketing: true, version: 1, decidedAt: RECENT, noticeVersion: "a" });
    function Notice({ v }: { v: string }) {
      const c = useConsent({ noticeVersion: v });
      return <p>{`${v} ${c.marketing} ${c.record ? "record" : "none"}`}</p>;
    }
    render(
      <>
        <Notice v="a" />
        <Notice v="b" />
      </>,
    );
    expect(screen.getByText("a true record")).toBeInTheDocument();
    expect(screen.getByText("b false none")).toBeInTheDocument();
  });

  it("follows a choice made in another tab, and ignores other keys", () => {
    render(<Probe />);
    expect(screen.getByText("true false false none")).toBeInTheDocument();

    store({ consentId: CID, marketing: true, version: 1, decidedAt: RECENT });
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: "other" })));
    expect(screen.getByText("true false false none")).toBeInTheDocument();

    act(() => window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_STORAGE_KEY })));
    expect(screen.getByText("true true false true")).toBeInTheDocument();

    window.localStorage.clear();
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: null })));
    expect(screen.getByText("true false false none")).toBeInTheDocument();
  });
});
