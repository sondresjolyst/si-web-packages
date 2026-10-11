import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BRANDING_REFRESH_MS, BrandingManager, BrandingProvider, toDataUrl, useBranding, type Branding } from "../../branding";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("../../toast", () => ({ toast }));

const LOGO: Branding = { logoData: "TE9HTw==", logoContentType: "image/png" };
const ICON: Branding = { iconData: "SUNPTg==", iconContentType: "image/x-icon" };

function Show() {
  const { logoUrl, branding, refresh } = useBranding();
  return (
    <div>
      <span data-testid="logo">{logoUrl ?? "none"}</span>
      <span data-testid="icon">{branding.iconContentType ?? "none"}</span>
      <button type="button" onClick={refresh}>refresh</button>
    </div>
  );
}

describe("toDataUrl", () => {
  it("builds a data URL, or null when a part is missing", () => {
    expect(toDataUrl("QUJD", "image/png")).toBe("data:image/png;base64,QUJD");
    expect(toDataUrl(null, "image/png")).toBeNull();
    expect(toDataUrl("QUJD", undefined)).toBeNull();
    expect(toDataUrl("", "")).toBeNull();
  });
});

describe("BrandingProvider", () => {
  afterEach(() => vi.useRealTimers());

  it("gives nothing outside a provider", () => {
    render(<Show />);
    expect(screen.getByTestId("logo")).toHaveTextContent("none");
  });

  it("uses the server's branding without loading it again", () => {
    const load = vi.fn(async () => ({}));
    render(<BrandingProvider load={load} initial={LOGO}><Show /></BrandingProvider>);
    expect(screen.getByTestId("logo")).toHaveTextContent("data:image/png;base64,TE9HTw==");
    expect(load).not.toHaveBeenCalled();
  });

  it("loads the branding on mount when the server sent none", async () => {
    const load = vi.fn(async () => ({ ...LOGO, ...ICON }));
    render(<BrandingProvider load={load}><Show /></BrandingProvider>);
    await waitFor(() => expect(screen.getByTestId("icon")).toHaveTextContent("image/x-icon"));
    expect(load).toHaveBeenCalledOnce();
  });

  it("loads the branding again every five minutes, and on refresh", async () => {
    vi.useFakeTimers();
    const load = vi.fn(async () => ICON);
    render(<BrandingProvider load={load} initial={{}}><Show /></BrandingProvider>);
    expect(BRANDING_REFRESH_MS).toBe(300000);

    await act(async () => { vi.advanceTimersByTime(BRANDING_REFRESH_MS - 1); });
    expect(load).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(load).toHaveBeenCalledOnce();
    expect(screen.getByTestId("icon")).toHaveTextContent("image/x-icon");

    await act(async () => { screen.getByText("refresh").click(); });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keeps the branding it has when a load fails", async () => {
    const load = vi.fn(() => Promise.reject(new Error("down")));
    render(<BrandingProvider load={load} initial={LOGO}><Show /></BrandingProvider>);
    await act(async () => { screen.getByText("refresh").click(); });
    expect(screen.getByTestId("logo")).toHaveTextContent("data:image/png;base64,TE9HTw==");
  });

  it("does not restart its timer when given a new load function on each render", async () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    const { rerender } = render(<BrandingProvider load={async () => { calls.push("a"); return {}; }} initial={{}}><Show /></BrandingProvider>);
    await act(async () => { vi.advanceTimersByTime(BRANDING_REFRESH_MS / 2); });
    rerender(<BrandingProvider load={async () => { calls.push("b"); return {}; }} initial={{}}><Show /></BrandingProvider>);
    await act(async () => { vi.advanceTimersByTime(BRANDING_REFRESH_MS / 2); });
    expect(calls).toEqual(["b"]);
  });
});

describe("BrandingManager", () => {
  beforeEach(() => {
    toast.success.mockReset();
    toast.error.mockReset();
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
  });

  const setup = (save: (form: FormData) => Promise<unknown>, initial: Branding = { ...LOGO, ...ICON }, load = vi.fn(async () => initial)) => {
    render(<BrandingProvider load={load} initial={initial}><BrandingManager save={save} /></BrandingProvider>);
    return load;
  };
  const sent = (form: FormData) => Object.fromEntries([...form.entries()].map(([k, v]) => [k, v instanceof File ? v.name : v]));

  it("shows the current logo and icon, and saves nothing until something changes", () => {
    setup(vi.fn());
    expect(screen.getByRole("heading", { name: "Branding" })).toBeInTheDocument();
    expect(screen.getByAltText("Logo")).toHaveAttribute("src", "data:image/png;base64,TE9HTw==");
    expect(screen.getByAltText("Icon (favicon)")).toHaveAttribute("src", "data:image/x-icon;base64,SUNPTg==");
    expect(screen.getByRole("button", { name: "Save branding" })).toBeDisabled();
  });

  it("previews a chosen file and sends it", async () => {
    const save = vi.fn<(form: FormData) => Promise<void>>(async () => {});
    const load = setup(save);
    await userEvent.upload(screen.getByLabelText("Logo"), new File(["x"], "logo.svg", { type: "image/svg+xml" }));
    await userEvent.upload(screen.getByLabelText("Icon (favicon)"), new File(["y"], "icon.ico", { type: "image/x-icon" }));
    expect(screen.getByAltText("Logo")).toHaveAttribute("src", "blob:preview");
    expect(screen.getByAltText("Icon (favicon)")).toHaveAttribute("src", "blob:preview");

    await userEvent.click(screen.getByRole("button", { name: "Save branding" }));

    expect(sent(save.mock.calls[0][0])).toEqual({ logo: "logo.svg", icon: "icon.ico" });
    expect(toast.success).toHaveBeenCalledWith("Branding saved");
    expect(load).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Save branding" })).toBeDisabled();
  });

  it("sends a removal and shows no image until saved", async () => {
    const save = vi.fn<(form: FormData) => Promise<void>>(async () => {});
    setup(save);
    await userEvent.click(screen.getByRole("button", { name: "Remove Icon (favicon)" }));
    expect(screen.queryByAltText("Icon (favicon)")).toBeNull();
    expect(screen.getAllByText("none")).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Save branding" }));
    expect(sent(save.mock.calls[0][0])).toEqual({ removeIcon: "true" });
  });

  it("takes back a removal when a new file is chosen", async () => {
    const save = vi.fn<(form: FormData) => Promise<void>>(async () => {});
    setup(save);
    await userEvent.click(screen.getByRole("button", { name: "Remove Logo" }));
    await userEvent.upload(screen.getByLabelText("Logo"), new File(["x"], "new.png", { type: "image/png" }));
    await userEvent.click(screen.getByRole("button", { name: "Save branding" }));
    expect(sent(save.mock.calls[0][0])).toEqual({ logo: "new.png" });
  });

  it("offers no removal when there is nothing to remove", () => {
    setup(vi.fn(), {});
    expect(screen.queryByRole("button", { name: /Remove/ })).toBeNull();
  });

  it("shows the save error and keeps the choice", async () => {
    const save = vi.fn(() => Promise.reject(new Error("Too large")));
    setup(save);
    await userEvent.upload(screen.getByLabelText("Logo"), new File(["x"], "big.png", { type: "image/png" }));
    await userEvent.click(screen.getByRole("button", { name: "Save branding" }));
    expect(toast.error).toHaveBeenCalledWith("Too large");
    expect(screen.getByRole("button", { name: "Save branding" })).toBeEnabled();
  });

  it("falls back to its own message for an error without one", async () => {
    setup(vi.fn(() => Promise.reject("nope")));
    await userEvent.click(screen.getByRole("button", { name: "Remove Logo" }));
    await userEvent.click(screen.getByRole("button", { name: "Save branding" }));
    expect(toast.error).toHaveBeenCalledWith("Failed to save branding");
  });

  it("disables the button while saving", async () => {
    let finish: () => void = () => {};
    setup(() => new Promise<void>(resolve => { finish = resolve; }));
    await userEvent.click(screen.getByRole("button", { name: "Remove Logo" }));
    await userEvent.click(screen.getByRole("button", { name: "Save branding" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    await act(async () => finish());
  });

  it("revokes a preview URL when the file changes", async () => {
    setup(vi.fn());
    await userEvent.upload(screen.getByLabelText("Logo"), new File(["x"], "a.png", { type: "image/png" }));
    await userEvent.upload(screen.getByLabelText("Logo"), new File(["y"], "b.png", { type: "image/png" }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
  });

  it("takes the app's own words", () => {
    render(<BrandingProvider load={vi.fn()} initial={{}}><BrandingManager save={vi.fn()} strings={{ title: "Profil", save: "Lagre" }} /></BrandingProvider>);
    expect(screen.getByRole("heading", { name: "Profil" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lagre" })).toBeInTheDocument();
  });
});

describe("the entry points", () => {
  it("mark each client component, not the barrel", () => {
    const read = (f: string) => readFileSync(join(__dirname, "../../branding", f), "utf8");
    expect(read("index.ts")).not.toContain('"use client"');
    expect(read("BrandingProvider.tsx").startsWith('"use client"')).toBe(true);
    expect(read("BrandingManager.tsx").startsWith('"use client"')).toBe(true);
    expect(read("index.ts")).not.toContain("server");
  });
});
