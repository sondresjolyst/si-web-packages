import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

const { revalidatePath, revalidateTag, getToken } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  getToken: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath, revalidateTag }));
vi.mock("next-auth/jwt", () => ({ getToken }));

import { createRevalidateRoute } from "../../server";

const POST = createRevalidateRoute({
  role: "Admin",
  targets: { builds: ["/no", "/no/builds", "/no/builds/[slug]"], branding: [] },
});

const request = (body: unknown, contentType = "application/json") =>
  new Request("http://app.test/api/revalidate", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as unknown as NextRequest;

const accessToken = (expiresInSeconds: number) =>
  jwt.sign({ sub: "1", exp: Math.floor(Date.now() / 1000) + expiresInSeconds }, "test-secret");

const admin = { user: { roles: ["Admin"] }, loginAt: Date.now(), accessToken: accessToken(3600) };
const DAY = 24 * 60 * 60 * 1000;

describe("createRevalidateRoute", () => {
  beforeEach(() => {
    revalidatePath.mockReset();
    revalidateTag.mockReset();
    getToken.mockReset();
  });

  it("refuses a caller without the role", async () => {
    getToken.mockResolvedValue({ ...admin, user: { roles: ["User"] } });

    const response = await POST(request({ target: "builds" }));

    expect(response.status).toBe(403);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses a session whose refresh was refused, though it still has the role", async () => {
    getToken.mockResolvedValue({ ...admin, error: "RefreshTokenRejected" });

    expect((await POST(request({ target: "builds" }))).status).toBe(403);
  });

  it("refuses a session past the seven days since sign-in", async () => {
    getToken.mockResolvedValue({ ...admin, loginAt: Date.now() - 8 * DAY });

    expect((await POST(request({ target: "builds" }))).status).toBe(403);
  });

  it("refuses a session without a sign-in time", async () => {
    getToken.mockResolvedValue({ user: { roles: ["Admin"] }, accessToken: accessToken(3600) });

    expect((await POST(request({ target: "builds" }))).status).toBe(403);
  });

  it("refuses a session whose access token expired, so a copied cookie stops working", async () => {
    getToken.mockResolvedValue({ ...admin, accessToken: accessToken(-120) });

    expect((await POST(request({ target: "builds" }))).status).toBe(403);
  });

  it("allows an access token that expired within the clock tolerance", async () => {
    getToken.mockResolvedValue({ ...admin, accessToken: accessToken(-30) });

    expect((await POST(request({ target: "builds" }))).status).toBe(200);
  });

  it("refuses a session without an access token", async () => {
    getToken.mockResolvedValue({ ...admin, accessToken: undefined });

    expect((await POST(request({ target: "builds" }))).status).toBe(403);
  });

  it("refuses a body that is not sent as JSON, such as a plain form post", async () => {
    getToken.mockResolvedValue(admin);

    const response = await POST(request('{"target":"builds","x":"="}', "text/plain"));

    expect(response.status).toBe(415);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("finds the session under the plain cookie name when the secure one is absent", async () => {
    getToken.mockImplementation(async ({ secureCookie }: { secureCookie: boolean }) => (secureCookie ? null : admin));

    expect((await POST(request({ target: "builds" }))).status).toBe(200);
    expect(getToken.mock.calls.map(([options]) => options.secureCookie)).toEqual([true, false]);
  });

  it("finds the session under the secure cookie name, as signed in behind a TLS proxy", async () => {
    getToken.mockImplementation(async ({ secureCookie }: { secureCookie: boolean }) => (secureCookie ? admin : null));

    expect((await POST(request({ target: "builds" }))).status).toBe(200);
  });

  it("refuses a caller without a session", async () => {
    getToken.mockResolvedValue(null);

    expect((await POST(request({ target: "builds" }))).status).toBe(403);
  });

  it("purges each path, a dynamic route as a page route, and the target as a tag", async () => {
    getToken.mockResolvedValue(admin);

    const response = await POST(request({ target: "builds" }));

    expect(response.status).toBe(200);
    expect(revalidatePath.mock.calls).toEqual([["/no"], ["/no/builds"], ["/no/builds/[slug]", "page"]]);
    expect(revalidateTag).toHaveBeenCalledWith("builds", { expire: 0 });
  });

  it("purges by tag alone for a target without paths", async () => {
    getToken.mockResolvedValue(admin);

    await POST(request({ target: "branding" }));

    expect(revalidatePath).not.toHaveBeenCalled();
    expect(revalidateTag).toHaveBeenCalledWith("branding", { expire: 0 });
  });

  it.each([
    ["an unknown target", { target: "nope" }],
    ["an inherited name", { target: "constructor" }],
    ["a body that is not JSON", "{"],
    ["no target", {}],
  ])("answers 400 for %s", async (_name, body) => {
    getToken.mockResolvedValue(admin);

    expect((await POST(request(body))).status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
