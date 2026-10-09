import { afterEach, describe, expect, it, vi } from "vitest";
import { createPublicApi, PublicApiError } from "../../server";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });

const api = createPublicApi("http://api.test/api");

describe("createPublicApi", () => {
  afterEach(() => fetchMock.mockReset());

  it("refuses an empty base URL", () => {
    expect(() => createPublicApi("")).toThrow(/base URL/);
  });

  it("returns the data, cached for 60 seconds with the given tags", async () => {
    fetchMock.mockResolvedValue(json({ title: "Terms" }));

    await expect(api.publicGet("/content/legal/terms", { tags: ["legal"] })).resolves.toEqual({ title: "Terms" });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/content/legal/terms", {
      next: { revalidate: 60, tags: ["legal"] },
    });
  });

  it("uses the revalidate window it is given", async () => {
    fetchMock.mockResolvedValue(json({}));

    await createPublicApi("http://api.test/api", { revalidate: 300 }).publicGet("/x");

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/x", { next: { revalidate: 300 } });
  });

  it("returns null for a resource that does not exist", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

    await expect(api.publicGet("/builds/missing")).resolves.toBeNull();
  });

  it("throws when the API answers with an error, so an empty page is never cached", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    await expect(api.publicGet("/builds")).rejects.toBeInstanceOf(PublicApiError);
    await expect(api.publicGet("/builds")).rejects.toMatchObject({ path: "/builds", status: 503 });
  });

  it("throws when the API cannot be reached", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(api.publicGet("/builds")).rejects.toMatchObject({ name: "PublicApiError", status: null });
  });

  it("throws when the body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 200 }));

    await expect(api.publicGet("/builds")).rejects.toBeInstanceOf(PublicApiError);
  });

  it("reads Last-Modified, and ignores one that is not a date", async () => {
    fetchMock.mockResolvedValueOnce(json({}, { headers: { "last-modified": "Thu, 01 Oct 2026 10:00:00 GMT" } }));
    fetchMock.mockResolvedValueOnce(json({}, { headers: { "last-modified": "soon" } }));

    expect((await api.publicGetWithMeta("/a"))?.lastModified?.toISOString()).toBe("2026-10-01T10:00:00.000Z");
    expect((await api.publicGetWithMeta("/b"))?.lastModified).toBeNull();
  });

  it.each([
    ["a relative path", "builds"],
    ["a path to another host", "//evil.test/x"],
  ])("throws for %s, without calling the API", async (_name, path) => {
    await expect(api.publicGet(path)).rejects.toThrow(/single "\/"/);
    await expect(api.publicGetOptional(path)).rejects.toThrow(/single "\/"/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a dot segment", "/content/../admin/users"],
    ["an encoded dot segment", "/content/%2e%2e/%2e%2e/x"],
    ["a mixed encoded dot segment", "/builds/%2E./users"],
    ["a single dot segment", "/builds/./x"],
  ])("gives null for %s, as for a missing resource, without calling the API", async (_name, path) => {
    await expect(api.publicGet(path)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps a host-only base URL on its host", async () => {
    fetchMock.mockResolvedValue(json({}));

    await createPublicApi("http://api.test").publicGet("/@evil.test/x");

    expect(new URL(fetchMock.mock.calls[0]?.[0] as string).host).toBe("api.test");
  });

  it("allows dots in the query string", async () => {
    fetchMock.mockResolvedValue(json({}));

    await api.publicGet("/content/home?next=/a/../b");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the query string", async () => {
    fetchMock.mockResolvedValue(json({}));

    await api.publicGet("/content/home?locale=no");

    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://api.test/api/content/home?locale=no");
  });

  it("gives null instead of throwing for optional data", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(api.publicGetOptional("/stats")).resolves.toBeNull();
  });
});
