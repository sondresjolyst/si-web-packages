import { describe, it, expect, beforeEach, vi } from "vitest";
import { refusedForCsrf, signInWithCredentials } from "../../session/react";

const signIn = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signIn(...args),
}));

const CSRF_REFUSAL = { error: null, ok: true, status: 200, url: "http://localhost:3000/api/auth/signin?csrf=true" };
const SIGNED_IN = { error: null, ok: true, status: 200, url: "http://localhost:3000/register" };

describe("refusedForCsrf", () => {
  it("is true for next-auth's sign-in page with csrf=true", () => {
    expect(refusedForCsrf(CSRF_REFUSAL.url)).toBe(true);
    expect(refusedForCsrf("/api/auth/signin?csrf=true")).toBe(true);
  });

  it("is false for any other address or none", () => {
    expect(refusedForCsrf("http://localhost:3000/login?csrf=true")).toBe(false);
    expect(refusedForCsrf("http://localhost:3000/api/auth/signin")).toBe(false);
    expect(refusedForCsrf(null)).toBe(false);
    expect(refusedForCsrf(undefined)).toBe(false);
  });
});

describe("signInWithCredentials", () => {
  beforeEach(() => {
    signIn.mockReset();
  });

  it("signs in through the credentials provider with no redirect", async () => {
    signIn.mockResolvedValue(SIGNED_IN);

    await expect(signInWithCredentials({ email: "a@b.no", password: "pw" })).resolves.toEqual(SIGNED_IN);
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(signIn).toHaveBeenCalledWith("credentials", { email: "a@b.no", password: "pw", redirect: false });
  });

  it("sends a sign-in refused for CSRF once more and returns that result", async () => {
    signIn.mockResolvedValueOnce(CSRF_REFUSAL).mockResolvedValueOnce(SIGNED_IN);

    await expect(signInWithCredentials({ email: "a@b.no", password: "pw" })).resolves.toEqual(SIGNED_IN);
    expect(signIn).toHaveBeenCalledTimes(2);
    expect(signIn).toHaveBeenLastCalledWith("credentials", { email: "a@b.no", password: "pw", redirect: false });
  });

  it("returns a second CSRF refusal without a third try", async () => {
    signIn.mockResolvedValue(CSRF_REFUSAL);

    const result = await signInWithCredentials({ email: "a@b.no", password: "pw" });

    expect(refusedForCsrf(result?.url)).toBe(true);
    expect(signIn).toHaveBeenCalledTimes(2);
  });

  it("returns any other failure without a retry", async () => {
    const failed = { error: "InvalidCredentials", ok: false, status: 401, url: null };
    signIn.mockResolvedValue(failed);

    await expect(signInWithCredentials({ email: "a@b.no", password: "pw" })).resolves.toEqual(failed);
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it("does not retry a request refused without an address", async () => {
    signIn.mockResolvedValue({ error: null, ok: false, status: 500, url: null });

    await signInWithCredentials({ email: "a@b.no", password: "pw" });

    expect(signIn).toHaveBeenCalledTimes(1);
  });
});
