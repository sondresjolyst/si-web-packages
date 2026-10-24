import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_STORAGE_KEY,
  ConsentBanner,
  ConsentSettingsLink,
  DEFAULT_CONSENT_MAX_AGE_DAYS,
  DEFAULT_LOG_NOTICE_VERSION,
  isValidNoticeVersion,
  getConsent,
  logConsent,
  MetaPixel,
  META_PIXEL_SCRIPT_SRC,
  setConsent,
} from "../../consent";
import { resetConsentStore } from "../../consent/consentStore";

vi.mock("next/navigation", async () => (await import("../../testing")).nextNavigationMock());

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CID = "6f1c1f9e-1c2d-4e5f-8a9b-0c1d2e3f4a5b";
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const store = (record: object) => window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
const stored = () => JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? "null");
const banner = () => screen.queryByRole("region");
const body = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string);

function Page(props: { logEndpoint?: string; logCredentials?: RequestCredentials; noticeVersion?: string; maxAgeDays?: number }) {
  return (
    <>
      <ConsentBanner enabled cookiesHref="/cookies" {...props} />
      <ConsentSettingsLink />
    </>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  resetConsentStore();
  delete (window as { fbq?: unknown }).fbq;
  for (const script of document.querySelectorAll("script")) script.remove();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("consentId", () => {
  it("is a random UUID made on the first choice and kept for later ones", () => {
    const first = setConsent({ marketing: true });
    expect(first.consentId).toMatch(UUID);
    expect(stored().consentId).toBe(first.consentId);

    expect(setConsent({ marketing: false, noticeVersion: "2" }).consentId).toBe(first.consentId);
    resetConsentStore();
    expect(setConsent({ marketing: true }).consentId).toBe(first.consentId);
  });

  it("is kept from a choice that no longer counts", () => {
    store({ consentId: CID, marketing: true, version: 1, decidedAt: daysAgo(400) });
    expect(getConsent().record).toBeNull();
    expect(setConsent({ marketing: true }).consentId).toBe(CID);
  });

  it("differs between browsers", () => {
    const a = setConsent({ marketing: true }).consentId;
    window.localStorage.clear();
    resetConsentStore();
    expect(setConsent({ marketing: true }).consentId).not.toBe(a);
  });

  it("is still a version 4 UUID where randomUUID is missing, such as outside HTTPS", () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });
    const ids = new Set(Array.from({ length: 50 }, () => {
      window.localStorage.clear();
      resetConsentStore();
      return setConsent({ marketing: true }).consentId;
    }));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(UUID);
  });

  it("comes from crypto.randomUUID where the browser has it", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("11111111-2222-4333-8444-555555555555");
    expect(setConsent({ marketing: true }).consentId).toBe("11111111-2222-4333-8444-555555555555");
  });

  it("is required in a stored record", () => {
    store({ marketing: true, version: 1, decidedAt: daysAgo(1) });
    expect(getConsent().record).toBeNull();
  });

  it.each([["abc"], ["6f1c1f9e1c2d4e5f8a9b0c1d2e3f4a5b"], ["00000000-0000-0000-0000-000000000000"], ["6f1c1f9e-1c2d-4e5f-8a9b-0c1d2e3f4a5g"]])(
    "makes a record with the consentId %j invalid",
    consentId => {
      store({ consentId, marketing: true, version: 1, decidedAt: daysAgo(1) });
      expect(getConsent().record).toBeNull();
    },
  );

  it("takes a UUID in capitals", () => {
    store({ consentId: CID.toUpperCase(), marketing: true, version: 1, decidedAt: daysAgo(1) });
    expect(getConsent().marketing).toBe(true);
  });

  it("stays the same when another tab chose first, with no subscriber and no storage event", () => {
    expect(getConsent().record).toBeNull();
    store({ consentId: CID, marketing: false, version: 1, decidedAt: daysAgo(0) });
    expect(setConsent({ marketing: true }).consentId).toBe(CID);
  });
});

describe("the age of a choice", () => {
  it("holds for 365 days by default, then counts as no choice", () => {
    expect(DEFAULT_CONSENT_MAX_AGE_DAYS).toBe(365);
    store({ consentId: CID, marketing: true, version: 1, decidedAt: daysAgo(364) });
    expect(getConsent().marketing).toBe(true);

    resetConsentStore();
    store({ consentId: CID, marketing: true, version: 1, decidedAt: daysAgo(366) });
    expect(getConsent()).toMatchObject({ marketing: false, record: null });
  });

  it("takes the app's maxAgeDays", () => {
    store({ consentId: CID, marketing: true, version: 1, decidedAt: daysAgo(31) });
    expect(getConsent({ maxAgeDays: 30 }).marketing).toBe(false);
    expect(getConsent({ maxAgeDays: 32 }).marketing).toBe(true);
  });

  it("counts a time it cannot read as no choice", () => {
    store({ consentId: CID, marketing: true, version: 1, decidedAt: "yesterday" });
    expect(getConsent().record).toBeNull();
  });

  it("asks again in the banner and loads no pixel for an old choice", () => {
    store({ consentId: CID, marketing: true, version: 1, decidedAt: daysAgo(400) });
    render(
      <>
        <Page />
        <MetaPixel pixelId="123456789012345" />
      </>,
    );
    expect(banner()).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    expect(document.querySelector(`script[src="${META_PIXEL_SCRIPT_SRC}"]`)).toBeNull();
  });

  it("uses the banner's maxAgeDays", () => {
    store({ consentId: CID, marketing: true, version: 1, decidedAt: daysAgo(10) });
    const { rerender } = render(<Page maxAgeDays={30} />);
    expect(banner()).not.toBeInTheDocument();
    rerender(<Page maxAgeDays={5} />);
    expect(banner()).toBeInTheDocument();
  });

  it("uses MetaPixel's maxAgeDays", () => {
    store({ consentId: CID, marketing: true, version: 1, decidedAt: daysAgo(10) });
    render(<MetaPixel pixelId="123456789012345" maxAgeDays={5} />);
    expect(document.querySelector(`script[src="${META_PIXEL_SCRIPT_SRC}"]`)).toBeNull();
  });
});

describe("noticeVersion", () => {
  const long = "a".repeat(65);

  it.each([[""], ["2026/10"], [long]])("throws for %j in development", value => {
    expect(() => setConsent({ marketing: true, noticeVersion: value })).toThrow(/noticeVersion/);
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ConsentBanner enabled cookiesHref="/c" noticeVersion={value} />)).toThrow(/noticeVersion/);
  });

  it("takes 64 of the allowed characters", () => {
    const value = "Aa0._-".repeat(10) + "abcd";
    expect(value).toHaveLength(64);
    expect(() => setConsent({ marketing: true, noticeVersion: value })).not.toThrow();
    expect(() => render(<ConsentBanner enabled cookiesHref="/c" noticeVersion={value} />)).not.toThrow();
  });

  it.each([[""], ["2026/10"], [long]])("never reaches the log as %j, which gets 1", value => {
    vi.stubEnv("NODE_ENV", "production");
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    const record = setConsent({ marketing: true, noticeVersion: value, log: { endpoint: "/consent", source: "banner" } });
    expect(record.noticeVersion).toBe(value);
    expect(body(fetch.mock.calls[0]!).noticeVersion).toBe("1");
    expect(isValidNoticeVersion(value)).toBe(false);
  });
});

describe("the consent log", () => {
  it("posts each choice with keepalive and no credentials, as banner then settings", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    render(<Page logEndpoint="https://api.example.com/api/consent" noticeVersion="2026-10" />);

    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.example.com/api/consent");
    expect(init).toMatchObject({ method: "POST", keepalive: true, credentials: "omit", headers: { "Content-Type": "application/json" } });
    const first = body(fetch.mock.calls[0]!);
    expect(first).toEqual({ consentId: stored().consentId, marketing: true, noticeVersion: "2026-10", schemaVersion: 1, source: "banner" });
    expect(first.consentId).toMatch(UUID);

    await userEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(body(fetch.mock.calls[1]!)).toEqual({ ...first, marketing: false, source: "settings" });
  });

  it("sends no IP or visitor data, and notice version 1 when the app sets none", () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    logConsent({ consentId: CID, marketing: true, version: 1, decidedAt: daysAgo(0) }, { endpoint: "/consent", source: "banner" });
    expect(Object.keys(body(fetch.mock.calls[0]!)).sort()).toEqual(["consentId", "marketing", "noticeVersion", "schemaVersion", "source"]);
    expect(DEFAULT_LOG_NOTICE_VERSION).toBe("1");
    expect(body(fetch.mock.calls[0]!).noticeVersion).toBe("1");
  });

  it("maps the record's version to schemaVersion", () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    logConsent({ consentId: CID, marketing: false, version: 7, decidedAt: daysAgo(0), noticeVersion: "v2" }, { endpoint: "/consent", source: "settings" });
    expect(body(fetch.mock.calls[0]!)).toEqual({ consentId: CID, marketing: false, noticeVersion: "v2", schemaVersion: 7, source: "settings" });
  });

  // The rules of the server's POST /consent, every field required.
  const serverAccepts = (p: Record<string, unknown>) =>
    Object.keys(p).sort().join() === "consentId,marketing,noticeVersion,schemaVersion,source" &&
    typeof p.consentId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.consentId) &&
    !/^[0-]+$/.test(p.consentId) &&
    typeof p.marketing === "boolean" &&
    typeof p.noticeVersion === "string" &&
    /^[A-Za-z0-9._-]{1,64}$/.test(p.noticeVersion) &&
    Number.isInteger(p.schemaVersion) &&
    (p.schemaVersion as number) >= 1 &&
    (p.source === "banner" || p.source === "settings");

  it.each([[undefined], ["2026-10-24"]])("posts what the server accepts, with notice version %j", async noticeVersion => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    render(<Page logEndpoint="/consent" {...(noticeVersion && { noticeVersion })} />);
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    await userEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
    await userEvent.click(screen.getByRole("button", { name: "Reject" }));

    expect(fetch).toHaveBeenCalledTimes(2);
    for (const call of fetch.mock.calls) {
      const payload = body(call);
      expect([payload, serverAccepts(payload)]).toEqual([payload, true]);
      expect(payload.noticeVersion).toBe(noticeVersion ?? "1");
    }
  });

  it("sends credentials only when the app asks", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    render(<Page logEndpoint="/consent" logCredentials="include" />);
    await userEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(fetch.mock.calls[0]![1]).toMatchObject({ credentials: "include" });
  });

  it("posts nothing without an endpoint", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["rejects", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["answers 500", () => Promise.resolve(new Response(null, { status: 500 }))],
    ["throws", () => {
      throw new TypeError("Invalid URL");
    }],
  ])("resolves, and never rejects, when the request %s", async (_name, impl) => {
    vi.spyOn(globalThis, "fetch").mockImplementation(impl as typeof fetch);
    await expect(logConsent({ consentId: CID, marketing: true, version: 1, decidedAt: daysAgo(0) }, { endpoint: "/consent", source: "banner" }))
      .resolves.toBeUndefined();
  });

  it("logs from setConsent in the same call, for a custom banner", () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    const record = setConsent({ marketing: true, noticeVersion: "v3", log: { endpoint: "/consent", source: "settings", credentials: "include" } });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]![0]).toBe("/consent");
    expect(fetch.mock.calls[0]![1]).toMatchObject({ credentials: "include", keepalive: true });
    expect(body(fetch.mock.calls[0]!)).toEqual({ consentId: record.consentId, marketing: true, noticeVersion: "v3", schemaVersion: 1, source: "settings" });
    setConsent({ marketing: false });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not wait for the log", async () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise<Response>(() => {}));
    render(<Page logEndpoint="/consent" />);
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(banner()).not.toBeInTheDocument();
    expect(getConsent().marketing).toBe(true);
  });

  it.each([
    ["rejects", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["throws", () => {
      throw new TypeError("Invalid URL");
    }],
  ])("keeps the choice when the request %s", async (_name, impl) => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    vi.spyOn(globalThis, "fetch").mockImplementation(impl as typeof fetch);
    render(<Page logEndpoint="/consent" />);

    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    await new Promise(resolve => setTimeout(resolve, 0));
    process.off("unhandledRejection", unhandled);

    expect(banner()).not.toBeInTheDocument();
    expect(getConsent().marketing).toBe(true);
    expect(stored()).toMatchObject({ marketing: true });
    expect(unhandled).not.toHaveBeenCalled();
  });
});
