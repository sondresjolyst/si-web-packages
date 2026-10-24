import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_STORAGE_KEY, CONSENT_VERSION, getConsent, openConsentSettings, setConsent, useConsent } from "../../consent";
import { getServerConsent, resetConsentStore, subscribeConsent } from "../../consent/consentStore";

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

    const record = { marketing: true, version: CONSENT_VERSION, decidedAt: "2026-10-24T12:00:00.000Z" };
    expect(CONSENT_STORAGE_KEY).toBe("consent");
    expect(CONSENT_VERSION).toBe(1);
    expect(stored()).toEqual(record);
    expect(getConsent()).toEqual({ ready: true, record, marketing: true, reopened: false });

    setConsent({ marketing: false });
    expect(stored()).toMatchObject({ marketing: false });
    expect(getConsent().marketing).toBe(false);
  });

  it("reads a stored record", () => {
    store({ marketing: true, version: 1, decidedAt: "2026-01-01T00:00:00.000Z" });
    expect(getConsent()).toMatchObject({ marketing: true, record: { decidedAt: "2026-01-01T00:00:00.000Z" } });
  });

  it.each([
    ["another version", { marketing: true, version: 2, decidedAt: "2026-01-01T00:00:00.000Z" }],
    ["no version", { marketing: true, decidedAt: "2026-01-01T00:00:00.000Z" }],
    ["a string for marketing", { marketing: "true", version: 1, decidedAt: "2026-01-01T00:00:00.000Z" }],
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

  it("is never ready on the server", () => {
    store({ marketing: true, version: 1, decidedAt: "2026-01-01T00:00:00.000Z" });
    expect(getServerConsent()).toEqual({ ready: false, record: null, marketing: false, reopened: false });
    expect(renderToString(<Probe />)).toBe("<p>false false false none</p>");
  });
});

describe("useConsent", () => {
  it("reads storage in the browser and follows changes", () => {
    store({ marketing: true, version: 1, decidedAt: "2026-01-01T00:00:00.000Z" });
    render(<Probe />);
    expect(screen.getByText("true true false true")).toBeInTheDocument();

    act(() => openConsentSettings());
    expect(screen.getByText("true true true true")).toBeInTheDocument();
    act(() => setConsent({ marketing: false }));
    expect(screen.getByText("true false false false")).toBeInTheDocument();
  });

  it("follows a choice made in another tab, and ignores other keys", () => {
    render(<Probe />);
    expect(screen.getByText("true false false none")).toBeInTheDocument();

    store({ marketing: true, version: 1, decidedAt: "2026-01-01T00:00:00.000Z" });
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: "other" })));
    expect(screen.getByText("true false false none")).toBeInTheDocument();

    act(() => window.dispatchEvent(new StorageEvent("storage", { key: CONSENT_STORAGE_KEY })));
    expect(screen.getByText("true true false true")).toBeInTheDocument();

    window.localStorage.clear();
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: null })));
    expect(screen.getByText("true false false none")).toBeInTheDocument();
  });
});
