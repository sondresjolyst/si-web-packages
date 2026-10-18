import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { formatNok, PaymentReturn, usePollUntilFinal, type PaymentReturnContent } from "../../payments";

// Real timers with short delays: waitFor does not work with vitest's fake timers here.
const settle = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe("usePollUntilFinal", () => {
  it("is loading from the first render, before the fetcher answers", () => {
    const { result } = renderHook(() => usePollUntilFinal(() => new Promise<string | null>(() => {}), v => v === "done"));
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it("stops once the value is final", async () => {
    const fetcher = vi.fn(async () => "done");
    const { result } = renderHook(() => usePollUntilFinal(fetcher, v => v === "done"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe("done");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("polls while the value is not final, showing each answer", async () => {
    const fetcher = vi.fn<() => Promise<string | null>>().mockResolvedValueOnce("pending").mockResolvedValueOnce("done");
    const { result } = renderHook(() => usePollUntilFinal(fetcher, v => v === "done", { delayMs: 300 }));
    await waitFor(() => expect(result.current.data).toBe("pending"));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe("done"));
    expect(result.current.loading).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("gives up after the retries and stops loading", async () => {
    const fetcher = vi.fn(async () => "pending");
    const { result } = renderHook(() => usePollUntilFinal(fetcher, v => v === "done", { retries: 2, delayMs: 10 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(result.current.data).toBe("pending");
  });

  it("waits the delay between fetches, 4 seconds and 8 retries by default", async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(async () => "pending");
      renderHook(() => usePollUntilFinal(fetcher, v => v === "done"));
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(fetcher).toHaveBeenCalledTimes(1);
      await act(async () => { await vi.advanceTimersByTimeAsync(3999); });
      expect(fetcher).toHaveBeenCalledTimes(1);
      await act(async () => { await vi.advanceTimersByTimeAsync(1); });
      expect(fetcher).toHaveBeenCalledTimes(2);
      await act(async () => { await vi.advanceTimersByTimeAsync(4000 * 20); });
      expect(fetcher).toHaveBeenCalledTimes(9);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops loading when a fetch fails", async () => {
    const { result } = renderHook(() => usePollUntilFinal(async () => { throw new Error("down"); }, () => true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
  });

  it("refresh() shows the spinner again and starts over", async () => {
    const fetcher = vi.fn(async () => "done");
    const { result } = renderHook(() => usePollUntilFinal(fetcher, v => v === "done"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.refresh());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("drops the answer of a run a refresh replaced", async () => {
    let answer: (v: string) => void = () => {};
    const fetcher = vi.fn<() => Promise<string | null>>()
      .mockImplementationOnce(() => new Promise(resolve => { answer = resolve; }))
      .mockResolvedValueOnce("fresh");
    const { result } = renderHook(() => usePollUntilFinal(fetcher, () => true));
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.data).toBe("fresh"));
    await act(async () => { answer("stale"); await settle(5); });
    expect(result.current.data).toBe("fresh");
  });

  it("uses the latest fetcher and isFinal", async () => {
    const first = vi.fn(async () => "a");
    const second = vi.fn(async () => "b");
    const { result, rerender } = renderHook(({ f, final }) => usePollUntilFinal(f, final, { delayMs: 10 }), {
      initialProps: { f: first, final: (v: string | null): boolean => v === "never" },
    });
    await waitFor(() => expect(first).toHaveBeenCalled());
    rerender({ f: second, final: (v: string | null) => v === "b" });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe("b");
  });

  it("stops when the page unmounts with a fetch still on its way", async () => {
    let answer: (v: string) => void = () => {};
    const fetcher = vi.fn(() => new Promise<string | null>(resolve => { answer = resolve; }));
    const { unmount } = renderHook(() => usePollUntilFinal(fetcher, v => v === "done", { delayMs: 10 }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    unmount();
    answer("pending");
    await settle(60);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("stops polling on unmount, also after a refresh", async () => {
    const fetcher = vi.fn(async () => "pending");
    const { result, unmount } = renderHook(() => usePollUntilFinal(fetcher, v => v === "done", { delayMs: 10 }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    act(() => result.current.refresh());
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    unmount();
    const calls = fetcher.mock.calls.length;
    await settle(60);
    expect(fetcher.mock.calls.length).toBe(calls);
  });
});

describe("formatNok", () => {
  it.each([
    [37375, "NOK 373,75"],
    [0, "NOK 0,00"],
    [5, "NOK 0,05"],
    [100000, "NOK 1000,00"],
    [-2500, "NOK -25,00"],
  ])("formats %i øre as %s", (ore, text) => expect(formatNok(ore)).toBe(text));
});

const content = (state: string, extra?: Partial<PaymentReturnContent>): PaymentReturnContent => ({
  title: `${state} title`, body: `${state} body`, href: `/${state}`, cta: `${state} cta`, ...extra,
});

const renderReturn = (state: "success" | "pending" | "failed", onRefresh?: () => void) =>
  render(
    <PaymentReturn
      state={state}
      success={content("success", { extra: <a href="/receipt">Receipt</a> })}
      pending={content("pending", { note: "We'll email you" })}
      failed={content("failed")}
      onRefresh={onRefresh}
    />,
  );

describe("PaymentReturn", () => {
  it("shows the confirmed state, with its extra and a primary link", () => {
    renderReturn("success", vi.fn());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("success title");
    expect(screen.getByText("success body")).toHaveClass("text-payment-text");
    expect(screen.getByRole("link", { name: "Receipt" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "success cta" })).toHaveAttribute("href", "/success");
    expect(screen.getByRole("link", { name: "success cta" })).toHaveClass("bg-button-primary-bg", "rounded-payment-button");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("pending title")).toBeNull();
    expect(document.querySelector("svg")).toHaveClass("text-payment-success");
  });

  it("shows the pending state with its note, a refresh button and a secondary link", async () => {
    const onRefresh = vi.fn();
    renderReturn("pending", onRefresh);
    expect(screen.getByRole("heading")).toHaveTextContent("pending title");
    expect(screen.getByText("We'll email you")).toHaveClass("text-payment-note");
    expect(screen.getByRole("link", { name: "pending cta" })).toHaveClass("bg-payment-secondary-bg", "px-4");
    expect(document.querySelector("svg")).toHaveClass("text-payment-pending");
    const button = screen.getByRole("button", { name: "Check again" });
    expect(button).toHaveAttribute("type", "button");
    await userEvent.click(button);
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("has no refresh button without onRefresh", () => {
    renderReturn("pending");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the failed state with a secondary link", () => {
    renderReturn("failed", vi.fn());
    expect(screen.getByRole("heading")).toHaveTextContent("failed title");
    expect(screen.getByRole("link", { name: "failed cta" })).toHaveClass("bg-payment-secondary-bg", "px-5");
    expect(screen.getByRole("link", { name: "failed cta" })).not.toHaveClass("px-4");
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.querySelector("svg")).toHaveClass("text-payment-failed");
  });

  it("takes another refresh label and placing classes", () => {
    const { container } = render(
      <PaymentReturn state="pending" success={content("s")} pending={content("p")} failed={content("f")} onRefresh={() => {}} refreshLabel="Sjekk igjen" className="pb-32" />,
    );
    expect(screen.getByRole("button", { name: "Sjekk igjen" })).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("pb-32", "flex");
  });

  describe("the live region", () => {
    const view = (state: "success" | "pending" | "failed") => (
      <PaymentReturn state={state} success={content("success")} pending={content("pending", { note: "We'll email you" })} failed={content("failed")} onRefresh={() => {}} />
    );

    it("is one polite, atomic status region holding the title, body and note", () => {
      render(view("pending"));
      const region = screen.getByRole("status");
      expect(screen.getAllByRole("status")).toHaveLength(1);
      expect(region).toHaveAttribute("aria-live", "polite");
      expect(region).toHaveAttribute("aria-atomic", "true");
      expect(region).toContainElement(screen.getByRole("heading", { level: 1 }));
      expect(region).toHaveTextContent("pending title");
      expect(region).toHaveTextContent("pending body");
      expect(region).toHaveTextContent("We'll email you");
    });

    it("keeps the buttons and links out of the region, so they are not read out", () => {
      render(view("pending"));
      const region = screen.getByRole("status");
      expect(region).not.toContainElement(screen.getByRole("button"));
      expect(region).not.toContainElement(screen.getByRole("link"));
    });

    it("stays the same element when the state changes, with the new text in it", () => {
      const { rerender } = render(view("pending"));
      const region = screen.getByRole("status");
      rerender(view("success"));
      expect(screen.getByRole("status")).toBe(region);
      expect(region).toHaveTextContent("success title");
      expect(region).toHaveTextContent("success body");
      expect(region).not.toHaveTextContent("pending title");
      expect(region).not.toHaveTextContent("We'll email you");
      rerender(view("failed"));
      expect(screen.getByRole("status")).toBe(region);
      expect(region).toHaveTextContent("failed title");
    });

    it("is present for every state, with the text already in it on first render", () => {
      for (const state of ["success", "pending", "failed"] as const) {
        const { unmount } = render(view(state));
        expect(screen.getByRole("status")).toHaveTextContent(`${state} title`);
        unmount();
      }
    });
  });
});

describe("the entry point", () => {
  it("marks the hook and the component as client files, not the barrel", () => {
    const read = (f: string) => readFileSync(join(__dirname, "../../payments", f), "utf8");
    expect(read("index.ts")).not.toContain('"use client"');
    expect(read("usePollUntilFinal.ts").startsWith('"use client"')).toBe(true);
    expect(read("PaymentReturn.tsx").startsWith('"use client"')).toBe(true);
    expect(read("formatNok.ts")).not.toContain('"use client"');
  });
});
