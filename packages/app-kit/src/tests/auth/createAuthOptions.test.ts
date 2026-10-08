import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import axios from "axios";
import jwt from "jsonwebtoken";
import type { JWT } from "next-auth/jwt";
import { createAuthOptions } from "../../auth";
import { defineSessionConfig } from "../../config";
import { SESSION_ERRORS, SIGN_IN_ERRORS, isTerminalSessionError } from "../../session";

const SECRET = "a-test-secret-long-enough-for-hmac-sha256";

type Token = JWT & {
  accessToken?: string;
  refreshToken?: string;
  refreshAt?: number;
  loginAt?: number;
  user?: { id: string; name: string; email: string; roles: string[] };
  error?: string;
  absoluteExpiresAt?: number;
};

const config = defineSessionConfig({
  jwtSecretEnvVar: "API_JWT_SECRET",
  loginRoute: "/login",
  draftStoragePrefix: "example",
});

// Tests answer login and refresh by swapping this client's adapter.
const apiClient = axios.create();
const authOptions = createAuthOptions(config, {
  env: { API_JWT_SECRET: SECRET },
  http: apiClient,
});

const HOUR_S = 60 * 60;

function apiToken({ lifetime = HOUR_S, secret = SECRET }: { lifetime?: number; secret?: string } = {}) {
  const iat = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { sub: "u1", unique_name: "admin", email: "a@b.no", role: ["Admin"], iat, nbf: iat - 5, exp: iat + lifetime },
    secret,
  );
}

// Each case gets its own refresh token, so the shared refresh map does not carry over between tests.
let tokenSeq = 0;

function sessionToken(overrides: Partial<Token> = {}): Token {
  return {
    accessToken: apiToken(),
    refreshToken: `RT-${++tokenSeq}`,
    refreshAt: Date.now() + 30 * 60 * 1000,
    loginAt: Date.now(),
    user: { id: "u1", name: "admin", email: "a@b.no", roles: ["Admin"] },
    ...overrides,
  };
}

// The jwt callback reads only token and user, so the rest of next-auth's arguments are left out.
const runJwt = (token: Token): Promise<Token> =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (authOptions.callbacks!.jwt as any)({ token });

// The tests go through the real HTTP path, so the 400 and 401 handling is covered too.
const originalAdapter = apiClient.defaults.adapter!;
let calls = 0;

function respondWith(body: { token: string; refreshToken: string } | Promise<{ token: string; refreshToken: string }>) {
  apiClient.defaults.adapter = async config => {
    calls += 1;
    return { data: await body, status: 200, statusText: "OK", headers: {}, config };
  };
}

function failWith(status: number) {
  apiClient.defaults.adapter = async () => {
    calls += 1;
    throw Object.assign(new Error(`status ${status}`), {
      isAxiosError: true,
      response: { status, data: { message: "Invalid or expired refresh token" } },
    });
  };
}

describe("the jwt callback at sign-in", () => {
  it("stores the tokens, the user and the times the session runs on", async () => {
    const accessToken = apiToken();
    const before = Date.now();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token: Token = await (authOptions.callbacks!.jwt as any)({
      token: {},
      user: { id: "u1", name: "admin", email: "a@b.no", roles: ["Admin"], accessToken, refreshToken: "RT-1" },
    });

    expect(token.accessToken).toBe(accessToken);
    expect(token.refreshToken).toBe("RT-1");
    expect(token.user).toEqual({ id: "u1", name: "admin", email: "a@b.no", roles: ["Admin"] });
    // The seven days count from here.
    expect(token.loginAt).toBeGreaterThanOrEqual(before);
    expect(token.refreshAt).toBeGreaterThan(Date.now());
    const exp = (jwt.decode(accessToken) as { exp: number }).exp * 1000;
    expect(exp - token.refreshAt!).toBe(5 * 60 * 1000);
    expect(token.error).toBeUndefined();
  });
});

describe("the jwt callback", () => {
  beforeEach(() => {
    calls = 0;
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it("leaves a healthy token alone and does not call the API", async () => {
    failWith(500);
    const token = sessionToken();

    const result = await runJwt(token);

    expect(result).toEqual(token);
    expect(calls).toBe(0);
  });

  it("refreshes once the scheduled time has passed", async () => {
    respondWith({ token: apiToken(), refreshToken: "RT-next" });

    // Still valid, but inside the window where a refresh is due.
    await runJwt(sessionToken({ refreshAt: Date.now() - 1000 }));

    expect(calls).toBe(1);
  });

  it("clears a recorded error once a refresh succeeds", async () => {
    respondWith({ token: apiToken(), refreshToken: "RT-next" });

    const result = await runJwt(sessionToken({ refreshAt: 0, error: "ECONNREFUSED" }));

    expect(result.error).toBeUndefined();
    expect(result.refreshToken).toBe("RT-next");
  });

  it("never logs the tokens when a refresh fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    apiClient.defaults.adapter = async (config) => {
      calls += 1;
      throw Object.assign(new Error("status 500"), { isAxiosError: true, config, response: { status: 500 } });
    };
    const token = sessionToken({ refreshAt: 0 });

    await runJwt(token);

    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain(token.refreshToken);
    expect(logged).not.toContain(token.accessToken);
    log.mockRestore();
  });

  it("keeps the old tokens when a refresh succeeds with an empty body", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    apiClient.defaults.adapter = async (config) => {
      calls += 1;
      return { data: "", status: 200, statusText: "OK", headers: {}, config };
    };
    const token = sessionToken({ refreshAt: 0 });

    const result = await runJwt(token);

    expect(result.refreshToken).toBe(token.refreshToken);
    expect(result.accessToken).toBe(token.accessToken);
    expect(result.error).toBeUndefined();
    expect(result.refreshAt! - Date.now()).toBeGreaterThan(55_000);
    log.mockRestore();
  });

  it("keeps the session through a transient refresh failure", async () => {
    failWith(500);
    const token = sessionToken({ refreshAt: 0 });

    const result = await runJwt(token);

    // An API restart keeps the user signed in.
    expect(result.error).toBeUndefined();
    expect(isTerminalSessionError(result.error)).toBe(false);
    expect(result.refreshToken).toBe(token.refreshToken);
  });

  it("keeps the session when the API cannot be reached at all", async () => {
    apiClient.defaults.adapter = async () => {
      calls += 1;
      throw Object.assign(new Error("connect ECONNREFUSED"), { isAxiosError: true, code: "ECONNREFUSED" });
    };

    const result = await runJwt(sessionToken({ refreshAt: 0 }));

    expect(result.error).toBeUndefined();
  });

  it("ends the session when the API rejects the refresh token itself", async () => {
    failWith(401);

    const result = await runJwt(sessionToken({ refreshAt: 0 }));

    expect(result.error).toBe(SESSION_ERRORS.refreshRejected);
    expect(isTerminalSessionError(result.error)).toBe(true);
  });

  it("ends the session when the API rejects the access token as malformed", async () => {
    failWith(400);

    const result = await runJwt(sessionToken({ refreshAt: 0 }));

    expect(result.error).toBe(SESSION_ERRORS.refreshRejected);
  });

  it("keeps the rotated tokens even when the new access token cannot be read", async () => {
    respondWith({ token: apiToken({ secret: "a-different-secret-entirely" }), refreshToken: "RT-next" });

    const result = await runJwt(sessionToken({ refreshAt: 0 }));

    // The API has used up the old token, so the session must keep the new one.
    expect(result.refreshToken).toBe("RT-next");
    expect(result.error).toBeUndefined();
    // The retry waits as long as a refresh result is remembered.
    expect(result.refreshAt! - Date.now()).toBeGreaterThan(55_000);
  });

  it("stops asking the API once the session is terminally dead", async () => {
    failWith(401);

    const result = await runJwt(sessionToken({ refreshAt: 0, error: SESSION_ERRORS.refreshRejected }));

    expect(calls).toBe(0);
    expect(result.error).toBe(SESSION_ERRORS.refreshRejected);
  });

  it("ends the session at the absolute cap, however fresh the access token is", async () => {
    failWith(500);

    const result = await runJwt(sessionToken({ loginAt: Date.now() - 8 * 24 * 60 * 60 * 1000 }));

    expect(result.error).toBe(SESSION_ERRORS.absoluteExpiry);
    expect(calls).toBe(0);
  });

  it("ends a session that has no sign-in time", async () => {
    failWith(500);
    const token = sessionToken();
    delete token.loginAt;

    const result = await runJwt(token);

    expect(result.error).toBe(SESSION_ERRORS.absoluteExpiry);
    expect(calls).toBe(0);
  });

  it("reports a session with no refresh token instead of hanging on to it", async () => {
    const token = sessionToken({ refreshAt: 0 });
    delete token.refreshToken;

    const result = await runJwt(token);

    expect(result.error).toBe(SESSION_ERRORS.noRefreshToken);
  });

  it("collapses parallel refreshes of the same token into one API call", async () => {
    let release: (value: { token: string; refreshToken: string }) => void = () => {};
    respondWith(new Promise(resolve => { release = resolve; }));
    const token = sessionToken({ refreshAt: 0 });

    const both = Promise.all([runJwt(token), runJwt(token)]);
    release({ token: apiToken(), refreshToken: "RT-next" });
    const [first, second] = await both;

    // A second request would reuse the token, and the API answers reuse by revoking every session.
    expect(calls).toBe(1);
    expect(first.refreshToken).toBe("RT-next");
    expect(second.refreshToken).toBe("RT-next");
  });

  it("answers a read that was already carrying the consumed token", async () => {
    respondWith({ token: apiToken(), refreshToken: "RT-next" });
    const token = sessionToken({ refreshAt: 0 });

    const first = await runJwt(token);
    // A slow read arrives after the refresh, still holding the old token. It gets the new one.
    const late = await runJwt(token);

    expect(calls).toBe(1);
    expect(late.refreshToken).toBe(first.refreshToken);
  });

  it("rotates a token it has not seen before", async () => {
    respondWith({ token: apiToken(), refreshToken: "RT-next" });

    await runJwt(sessionToken({ refreshAt: 0 }));
    await runJwt(sessionToken({ refreshAt: 0 }));

    expect(calls).toBe(2);
  });

  it("does not fall into a rotation on every read when the token carries no lifetime", async () => {
    const iat = Math.floor(Date.now() / 1000);
    const noExpiry = jwt.sign({ sub: "u1", unique_name: "admin", email: "a@b.no", role: ["Admin"], iat }, SECRET);
    respondWith({ token: noExpiry, refreshToken: "RT-next" });

    const result = await runJwt(sessionToken({ refreshAt: 0 }));

    // A token without exp gets the 30 s floor, not the 60 s retry wait.
    expect(result.refreshAt! - Date.now()).toBeGreaterThan(25_000);
    expect(result.refreshAt! - Date.now()).toBeLessThan(35_000);
  });

  it("backs off instead of retrying a sick API on every request", async () => {
    failWith(503);

    const result = await runJwt(sessionToken({ refreshAt: 0 }));

    expect(result.error).toBeUndefined();
    // The retry waits as long as a refresh result is remembered.
    expect(result.refreshAt! - Date.now()).toBeGreaterThan(55_000);
  });

  it("refreshes a 2-minute token 30 seconds before it expires", async () => {
    const token = apiToken({ lifetime: 120 });
    respondWith({ token, refreshToken: "RT-next" });

    const result = await runJwt(sessionToken({ refreshAt: 0 }));

    // A quarter of 120 s.
    const exp = (jwt.decode(token) as { exp: number }).exp * 1000;
    expect(exp - result.refreshAt!).toBe(30_000);
  });

  it("refreshes five minutes ahead of a long-lived token's expiry", async () => {
    const token = apiToken();
    respondWith({ token, refreshToken: "RT-next" });

    const result = await runJwt(sessionToken({ refreshAt: 0 }));

    const exp = (jwt.decode(token) as { exp: number }).exp * 1000;
    expect(exp - result.refreshAt!).toBe(5 * 60 * 1000);
  });

  it("refreshes a quarter of the lifetime ahead when that is under five minutes", async () => {
    const token = apiToken({ lifetime: 8 * 60 });
    respondWith({ token, refreshToken: "RT-next" });

    const result = await runJwt(sessionToken({ refreshAt: 0 }));

    const exp = (jwt.decode(token) as { exp: number }).exp * 1000;
    expect(exp - result.refreshAt!).toBe(2 * 60 * 1000);
  });

  it("never schedules a refresh sooner than 30 seconds out", async () => {
    // A 20 s token would be due 15 s from now. The 30 s floor applies.
    respondWith({ token: apiToken({ lifetime: 20 }), refreshToken: "RT-next" });

    const result = await runJwt(sessionToken({ refreshAt: 0 }));

    expect(result.refreshAt! - Date.now()).toBeGreaterThan(29_000);
    expect(result.refreshAt! - Date.now()).toBeLessThanOrEqual(30_000);
  });

  it("counts the minute from the answer, so a slow refresh is remembered as long", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      let release: (value: { token: string; refreshToken: string }) => void = () => {};
      respondWith(new Promise((resolve) => { release = resolve; }));
      const token = sessionToken({ refreshAt: 0 });

      const first = runJwt(token);
      // The API takes ten seconds to answer.
      vi.advanceTimersByTime(10_000);
      release({ token: apiToken(), refreshToken: "RT-next" });
      await first;

      vi.advanceTimersByTime(55_000);
      await runJwt(token);
      expect(calls).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("remembers a rotation for a minute, then lets the token rotate again", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      respondWith({ token: apiToken(), refreshToken: "RT-next" });
      const token = sessionToken({ refreshAt: 0 });

      await runJwt(token);
      // A slow read can arrive well after the refresh, still holding the old token.
      vi.advanceTimersByTime(59_000);
      await runJwt(token);
      expect(calls).toBe(1);

      vi.advanceTimersByTime(2_000);
      await runJwt(token);
      expect(calls).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("re-reads the roles the API returns on a refresh", async () => {
    respondWith({ token: apiToken(), refreshToken: "RT-next" });

    const result = await runJwt(
      sessionToken({ refreshAt: 0, user: { id: "u1", name: "admin", email: "a@b.no", roles: [] } }),
    );

    expect(result.user?.roles).toEqual(["Admin"]);
  });
});

describe("the session callback", () => {
  const runSession = (token: Token) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (authOptions.callbacks!.session as any)({ session: { user: null, expires: "" }, token });

  it("publishes the absolute expiry so the UI can warn before it lands", async () => {
    const loginAt = Date.now();

    const session = await runSession(sessionToken({ loginAt }));

    expect(session.absoluteExpiresAt).toBe(loginAt + 7 * 24 * 60 * 60 * 1000);
  });

  it("carries the user and the access token the API client sends", async () => {
    const token = sessionToken();

    const session = await runSession(token);

    expect(session.user).toEqual(token.user);
    expect(session.accessToken).toBe(token.accessToken);
  });

  it("passes the error through so the gate and the prompt can see it", async () => {
    const session = await runSession(sessionToken({ error: SESSION_ERRORS.absoluteExpiry }));

    expect(session.error).toBe(SESSION_ERRORS.absoluteExpiry);
  });
});

describe("the requests to the API", () => {
  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  function capture() {
    const sent: { url?: string | undefined; body: unknown; timeout?: number | undefined }[] = [];
    apiClient.defaults.adapter = async (config) => {
      sent.push({ url: config.url, body: JSON.parse(String(config.data)), timeout: config.timeout });
      return { data: { token: apiToken(), refreshToken: "RT-next" }, status: 200, statusText: "OK", headers: {}, config };
    };
    return sent;
  }

  it("posts the credentials to /auth/login", async () => {
    const sent = capture();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (authOptions.providers[0] as any).options.authorize({ email: "a@b.no", password: "pw" }, {});

    expect(sent).toEqual([{ url: "/auth/login", body: { email: "a@b.no", password: "pw" }, timeout: 10_000 }]);
  });

  it("posts both tokens to /auth/refresh-token, with a bounded wait", async () => {
    const sent = capture();
    const token = sessionToken({ refreshAt: 0 });

    await runJwt(token);

    expect(sent).toEqual([
      { url: "/auth/refresh-token", body: { token: token.accessToken, refreshToken: token.refreshToken }, timeout: 10_000 },
    ]);
  });

  it("builds its own client on apiUrl when none is given", () => {
    const create = vi.spyOn(axios, "create");

    createAuthOptions(config, { apiUrl: "https://api.example", env: {} });

    expect(create).toHaveBeenCalledWith({ baseURL: "https://api.example", allowAbsoluteUrls: false });
  });
});

describe("sign-in", () => {
  // authorize does not read next-auth's request argument.
  const authorize = (credentials: { email: string; password: string } | undefined) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (authOptions.providers[0] as any).options.authorize(credentials, {});

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    vi.restoreAllMocks();
  });

  it("builds the user from the access token the API returns", async () => {
    respondWith({ token: apiToken(), refreshToken: "RT-1" });

    const user = await authorize({ email: "a@b.no", password: "pw" });

    expect(user).toMatchObject({ id: "u1", name: "admin", email: "a@b.no", roles: ["Admin"], refreshToken: "RT-1" });
  });

  it("turns any failure into one message and never logs the password", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    apiClient.defaults.adapter = async config => {
      throw Object.assign(new Error("status 401"), { isAxiosError: true, config, response: { status: 401 } });
    };

    await expect(authorize({ email: "a@b.no", password: "secret-password" })).rejects.toThrow(SIGN_IN_ERRORS.invalidCredentials);

    expect(JSON.stringify(log.mock.calls)).not.toContain("secret-password");
  });

  it("reports wrong credentials when the API answers with an empty body", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    apiClient.defaults.adapter = async (config) => ({ data: "", status: 204, statusText: "No Content", headers: {}, config });

    await expect(authorize({ email: "a@b.no", password: "pw" })).rejects.toThrow(SIGN_IN_ERRORS.invalidCredentials);
  });

  it("accepts a token that becomes valid up to a minute from now", async () => {
    const now = Math.floor(Date.now() / 1000);
    const ahead = jwt.sign({ sub: "u1", unique_name: "admin", role: ["Admin"], iat: now + 59, nbf: now + 59, exp: now + HOUR_S }, SECRET);
    respondWith({ token: ahead, refreshToken: "RT-1" });

    await expect(authorize({ email: "a@b.no", password: "pw" })).resolves.toMatchObject({ id: "u1" });
  });

  it("refuses a token that becomes valid more than a minute from now", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const now = Math.floor(Date.now() / 1000);
    const early = jwt.sign({ sub: "u1", unique_name: "admin", role: ["Admin"], iat: now, nbf: now + 62, exp: now + HOUR_S }, SECRET);
    respondWith({ token: early, refreshToken: "RT-1" });

    await expect(authorize({ email: "a@b.no", password: "pw" })).rejects.toThrow(SIGN_IN_ERRORS.invalidCredentials);
  });

  it("reports wrong credentials when the API sends no refresh token", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    apiClient.defaults.adapter = async (config) => ({
      data: { token: apiToken() },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    });

    await expect(authorize({ email: "a@b.no", password: "pw" })).rejects.toThrow(SIGN_IN_ERRORS.invalidCredentials);
  });

  it("reports the API as unavailable when it does not answer or a gateway fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const response of [undefined, { status: 502 }, { status: 503 }, { status: 504 }]) {
      apiClient.defaults.adapter = async (config) => {
        throw Object.assign(new Error("down"), { isAxiosError: true, config, response, code: response ? undefined : "ECONNREFUSED" });
      };

      await expect(authorize({ email: "a@b.no", password: "pw" })).rejects.toThrow(SIGN_IN_ERRORS.unavailable);
    }
  });

  it("reports wrong credentials for every answer the API gives, a plain 500 included", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const status of [400, 401, 403, 429, 500]) {
      apiClient.defaults.adapter = async (config) => {
        throw Object.assign(new Error(`status ${status}`), { isAxiosError: true, config, response: { status } });
      };

      await expect(authorize({ email: "a@b.no", password: "pw" })).rejects.toThrow(SIGN_IN_ERRORS.invalidCredentials);
    }
  });

  it("refuses an access token signed with another secret", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    respondWith({ token: apiToken({ secret: "a-different-secret-entirely" }), refreshToken: "RT-1" });

    await expect(authorize({ email: "a@b.no", password: "pw" })).rejects.toThrow(SIGN_IN_ERRORS.invalidCredentials);
  });
});

describe("the options", () => {
  it("point next-auth at the login route from the config", () => {
    expect(authOptions.pages?.signIn).toBe("/login");
    expect(authOptions.session?.maxAge).toBe(7 * 24 * 60 * 60);
  });

  it("leave the session secret to next-auth, which reads NEXTAUTH_SECRET itself", () => {
    // next-auth reads NEXTAUTH_SECRET itself.
    expect(authOptions.secret).toBeUndefined();
    expect(authOptions.jwt).toBeUndefined();
  });

  it("refuse to start without the API base URL", () => {
    expect(() => createAuthOptions(config, { apiUrl: "", env: {} })).toThrow("API base URL");
  });
});
