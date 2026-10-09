import { afterEach, describe, expect, it, vi } from "vitest";
import { requestRevalidate } from "../../api";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("requestRevalidate", () => {
  afterEach(() => fetchMock.mockReset());

  it("posts the target to the revalidate route", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await requestRevalidate("legal");

    expect(fetchMock).toHaveBeenCalledWith("/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "legal" }),
    });
  });

  it("does not throw when the request fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(requestRevalidate("legal", "/custom")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/custom");
  });
});
