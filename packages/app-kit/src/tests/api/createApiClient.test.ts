import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Session } from "next-auth";

const getSession = vi.fn();

vi.mock("next-auth/react", () => ({
  getSession: (...args: unknown[]) => getSession(...args),
}));

const { createApiClient } = await import("../../api");
const { closeSessionPrompt, getSessionPromptOpen } = await import("../../session");

const axiosInstance = createApiClient("https://api.invalid");

const session = (error?: string) =>
  ({ user: { name: "admin" }, accessToken: "token", error, expires: "" }) as Session;

const originalAdapter = axiosInstance.defaults.adapter!;

function rejectWith(status: number) {
  axiosInstance.defaults.adapter = async () => {
    throw Object.assign(new Error(`status ${status}`), { isAxiosError: true, response: { status } });
  };
}

describe("createApiClient on an unauthorized response", () => {
  beforeEach(() => {
    getSession.mockReset();
    closeSessionPrompt();
  });

  afterEach(() => {
    axiosInstance.defaults.adapter = originalAdapter;
    closeSessionPrompt();
  });

  it("asks for a new sign-in when the session cannot recover", async () => {
    getSession.mockResolvedValue(session("RefreshTokenRejected"));
    rejectWith(401);

    await expect(axiosInstance.get("/recipes")).rejects.toThrow();

    // The prompt keeps the page, so a half-written form survives.
    expect(getSessionPromptOpen()).toBe(true);
  });

  it("asks for a new sign-in when the session cookie is gone", async () => {
    getSession.mockResolvedValue(null);
    rejectWith(401);

    await expect(axiosInstance.get("/recipes")).rejects.toThrow();

    // The cookie is gone, so there is no error field, but the user still needs the prompt.
    expect(getSessionPromptOpen()).toBe(true);
  });

  it("stays quiet when a request races an expiring token on a recoverable session", async () => {
    getSession.mockResolvedValue(session());
    rejectWith(401);

    await expect(axiosInstance.get("/recipes")).rejects.toThrow();

    // The next session read refreshes, so the user's next action succeeds without signing in.
    expect(getSessionPromptOpen()).toBe(false);
  });

  it("stays quiet when the session is only transiently unhappy", async () => {
    getSession.mockResolvedValue(session("ECONNREFUSED"));
    rejectWith(401);

    await expect(axiosInstance.get("/recipes")).rejects.toThrow();

    expect(getSessionPromptOpen()).toBe(false);
  });

  it("stays quiet on a status that is not about the session at all", async () => {
    getSession.mockResolvedValue(null);
    rejectWith(403);

    await expect(axiosInstance.get("/admin/users")).rejects.toThrow();

    expect(getSessionPromptOpen()).toBe(false);
  });
});

describe("createApiClient on a request", () => {
  afterEach(() => {
    axiosInstance.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it("reads the session without telling other tabs to refetch theirs", async () => {
    getSession.mockResolvedValue(session());
    axiosInstance.defaults.adapter = async (config) => ({ data: {}, status: 200, statusText: "OK", headers: {}, config });

    await axiosInstance.get("/recipes");

    expect(getSession).toHaveBeenCalledWith({ broadcast: false });
  });

  it("sends the session access token", async () => {
    getSession.mockResolvedValue(session());
    let authorization: unknown;
    axiosInstance.defaults.adapter = async config => {
      authorization = config.headers.Authorization;
      return { data: {}, status: 200, statusText: "OK", headers: {}, config };
    };

    await axiosInstance.get("/recipes");

    expect(authorization).toBe("Bearer token");
  });

  it("sends requests to the base URL it was given", async () => {
    getSession.mockResolvedValue(null);
    let baseURL: unknown;
    axiosInstance.defaults.adapter = async (config) => {
      baseURL = config.baseURL;
      return { data: {}, status: 200, statusText: "OK", headers: {}, config };
    };

    await axiosInstance.get("/recipes");

    expect(baseURL).toBe("https://api.invalid");
  });

  it("never sends a request to an absolute URL away from the API", async () => {
    getSession.mockResolvedValue(session());
    // Go through axios's browser adapter, which builds the URL and opens it. Stop at open.
    let opened = "";
    vi.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(function (_method: string, url: string | URL) {
      opened = String(url);
      throw new Error("stopped before sending");
    });
    axiosInstance.defaults.adapter = "xhr";

    await expect(axiosInstance.get("https://elsewhere.invalid/steal")).rejects.toThrow();

    expect(opened).toMatch(/^https:\/\/api\.invalid\//);
  });

  it("refuses to start without a base URL", () => {
    // Without a base URL, every call would go to the page's own origin.
    expect(() => createApiClient("")).toThrow("API base URL");
  });

  it("sends no Authorization header without a session", async () => {
    getSession.mockResolvedValue(null);
    let authorization: unknown = "unset";
    axiosInstance.defaults.adapter = async config => {
      authorization = config.headers.Authorization;
      return { data: {}, status: 200, statusText: "OK", headers: {}, config };
    };

    await axiosInstance.get("/recipes");

    expect(authorization).toBeUndefined();
  });
});
