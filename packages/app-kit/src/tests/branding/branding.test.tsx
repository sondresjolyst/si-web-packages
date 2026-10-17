import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "../../api";
import { BrandingManager, BrandingProvider, defaultBrandingManagerStrings, useBranding, type Branding } from "../../branding";
import { BRANDING_REFRESH_MS } from "../../branding/BrandingProvider";
import { toDataUrl } from "../../branding/types";
import { nbBrandingManagerStrings } from "../../locales/nb";

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

// The API's English rule for a refused image.
const RULE = "The image must be a PNG, JPEG, WebP, GIF or ICO file of at most 2 MB.";

// The Error that `request` throws when the API refuses a file, with the codes extension.
const refusal = (errors: Record<string, string[]>, codes: Record<string, string[]>) =>
  request(
    () =>
      Promise.reject(
        Object.assign(new Error("Request failed with status code 400"), {
          isAxiosError: true,
          response: { status: 400, data: { title: "One or more validation errors occurred.", errors, codes, limits: {} } },
        }),
      ),
    "Failed",
  ).catch((e: unknown) => e);

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
    await userEvent.upload(screen.getByLabelText("Logo"), new File(["x"], "logo.webp", { type: "image/webp" }));
    await userEvent.upload(screen.getByLabelText("Icon (favicon)"), new File(["y"], "icon.ico", { type: "image/x-icon" }));
    expect(screen.getByAltText("Logo")).toHaveAttribute("src", "blob:preview");
    expect(screen.getByAltText("Icon (favicon)")).toHaveAttribute("src", "blob:preview");

    await userEvent.click(screen.getByRole("button", { name: "Save branding" }));

    expect(sent(save.mock.calls[0][0])).toEqual({ logo: "logo.webp", icon: "icon.ico" });
    expect(toast.success).toHaveBeenCalledWith("Branding saved");
    expect(load).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Save branding" })).toBeDisabled();
  });

  it("offers only the types the API accepts, and says which", async () => {
    setup(vi.fn());
    const logo = screen.getByLabelText("Logo");

    expect(logo).toHaveAttribute("accept", "image/png,image/jpeg,image/webp,image/gif,image/x-icon,.ico");
    await userEvent.upload(logo, new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" }));
    expect(screen.getByRole("button", { name: "Save branding" })).toBeDisabled();
    expect(screen.getByText(/PNG, JPEG, WebP, or GIF, max 2 MB/)).toBeInTheDocument();
    expect(screen.getByText(/Square PNG or ICO, max 2 MB/)).toBeInTheDocument();
    expect(screen.queryByText(/SVG/)).not.toBeInTheDocument();
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

  it("previews only raster images, not a stored type that could carry script", () => {
    setup(vi.fn(), { logoData: "PHN2Zz4=", logoContentType: "image/svg+xml", iconData: "PGh0bWw+", iconContentType: "text/html" });
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getAllByText("none")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Remove Logo" })).toBeInTheDocument();
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

  it("shows the app's text for a refused file under its slot and in the toast", async () => {
    const save = vi.fn().mockRejectedValueOnce(await refusal({ Icon: [RULE] }, { Icon: ["invalidImage"] })).mockResolvedValueOnce(undefined);
    render(
      <BrandingProvider load={vi.fn(async () => ({}))} initial={{ ...LOGO, ...ICON }}>
        <BrandingManager save={save} strings={{ validation: { invalidImage: "Ugyldig filformat. Last opp en bildefil." } }} />
      </BrandingProvider>,
    );
    await userEvent.upload(screen.getByLabelText("Logo"), new File(["x"], "logo.png", { type: "image/png" }));
    await userEvent.upload(screen.getByLabelText("Icon (favicon)"), new File(["y"], "icon.txt", { type: "image/x-icon" }));

    await userEvent.click(screen.getByRole("button", { name: "Save branding" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Ugyldig filformat. Last opp en bildefil."));
    const icon = screen.getByLabelText("Icon (favicon)");
    expect(icon).toHaveAccessibleDescription("Ugyldig filformat. Last opp en bildefil.");
    expect(icon).toHaveAttribute("aria-invalid", "true");
    const [logoChoose, iconChoose] = screen.getAllByRole("button", { name: "Choose" });
    expect(iconChoose).toHaveAccessibleDescription("Ugyldig filformat. Last opp en bildefil.");
    expect(logoChoose).not.toHaveAttribute("aria-describedby");
    expect(screen.getByLabelText("Logo")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Logo")).not.toHaveAttribute("aria-describedby");

    await userEvent.upload(screen.getByLabelText("Icon (favicon)"), new File(["z"], "icon.ico", { type: "image/x-icon" }));
    await userEvent.click(screen.getByRole("button", { name: "Save branding" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Branding saved"));
    expect(screen.queryByText("Ugyldig filformat. Last opp en bildefil.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Icon (favicon)")).not.toHaveAttribute("aria-invalid");
  });

  it("shows the English default for a known code and the API's message for an unknown one", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(await refusal({ Logo: ["Too big."] }, { Logo: ["imageTooLarge"] }))
      .mockRejectedValueOnce(await refusal({ Logo: ["Not an image."] }, { Logo: ["invalidImage"] }))
      .mockRejectedValueOnce(await refusal({ Logo: ["Send the images as a form."] }, { Logo: ["notAForm"] }));
    setup(save);
    await userEvent.upload(screen.getByLabelText("Logo"), new File(["x"], "big.png", { type: "image/png" }));

    await userEvent.click(screen.getByRole("button", { name: "Save branding" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("The file is too large. Upload a file of 2 MB or less."));
    expect(screen.getByLabelText("Logo")).toHaveAccessibleDescription("The file is too large. Upload a file of 2 MB or less.");

    toast.error.mockReset();
    await userEvent.click(screen.getByRole("button", { name: "Save branding" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Invalid file format. Upload a PNG, JPEG, WebP, GIF or ICO image."));
    expect(screen.getByLabelText("Logo")).toHaveAccessibleDescription("Invalid file format. Upload a PNG, JPEG, WebP, GIF or ICO image.");

    await userEvent.click(screen.getByRole("button", { name: "Save branding" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Send the images as a form."));
    expect(screen.getByLabelText("Logo")).toHaveAccessibleDescription("Send the images as a form.");
  });

  it("gives each refusal code its own text, in English and Norwegian", () => {
    for (const set of [defaultBrandingManagerStrings, nbBrandingManagerStrings]) expect(set.validation.invalidImage).not.toBe(set.validation.imageTooLarge);
    expect(nbBrandingManagerStrings.validation.imageTooLarge).toBe("Filen er for stor. Last opp en fil på 2 MB eller mindre.");
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
