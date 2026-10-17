import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompanySettingsForm } from "../../admin";
import { request, type SiteSettings } from "../../api";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("../../toast", () => ({ toast }));

const saved: SiteSettings = {
  contactRecipientEmail: "inbox@example.no",
  companyName: "NS Tuning",
  companyLegalName: "Nordmark Service AS",
  orgNumber: "923 202 374",
  vatRegistered: true,
  streetAddress: "Håbakken 7",
  postalCode: "4355",
  addressLocality: "Kvernaland",
  addressRegion: "",
  publicEmail: "post@example.no",
  publicPhone: "+47 400 00 000",
};

const service = { get: vi.fn(), update: vi.fn() };

// The Error that `request` throws for an ASP.NET validation problem.
const validationError = (errors: Record<string, string[]>) =>
  request(
    () =>
      Promise.reject(
        Object.assign(new Error("Request failed with status code 400"), {
          isAxiosError: true,
          response: { status: 400, data: { title: "One or more validation errors occurred.", errors } },
        }),
      ),
    "Failed",
  ).catch((e: unknown) => e);

beforeEach(() => {
  service.get.mockReset().mockResolvedValue(saved);
  service.update.mockReset().mockImplementation(async (s: SiteSettings) => ({ ...s, companyName: s.companyName.trim() }));
  toast.success.mockReset();
  toast.error.mockReset();
});

describe("CompanySettingsForm", () => {
  it("shows loading, then the saved settings, and its children below", async () => {
    render(
      <CompanySettingsForm service={service}>
        <p>branding</p>
      </CompanySettingsForm>,
    );

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("branding")).not.toBeInTheDocument();
    expect(await screen.findByLabelText(/^Company name/)).toHaveValue("NS Tuning");
    expect(screen.getByLabelText(/^Legal name/)).toHaveValue("Nordmark Service AS");
    expect(screen.getByLabelText(/^Organisation number/)).toHaveValue("923 202 374");
    expect(screen.getByRole("switch", { name: "VAT (MVA) registered" })).toBeChecked();
    expect(screen.getByLabelText(/^Postal code/)).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText(/^Place/)).toHaveValue("Kvernaland");
    expect(screen.getByText("branding")).toBeInTheDocument();
  });

  it("saves every field, shows what the API kept, and says so", async () => {
    render(<CompanySettingsForm service={service} />);
    const name = await screen.findByLabelText(/^Company name/);

    await userEvent.clear(name);
    await userEvent.type(name, " NS Tuning AS ");
    await userEvent.click(screen.getByRole("switch", { name: "VAT (MVA) registered" }));
    await userEvent.type(screen.getByLabelText(/^County/), "Rogaland");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(service.update).toHaveBeenCalledWith({ ...saved, companyName: " NS Tuning AS ", vatRegistered: false, addressRegion: "Rogaland" });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Settings saved"));
    expect(screen.getByLabelText(/^Company name/)).toHaveValue("NS Tuning AS");
  });

  it("disables the button while saving", async () => {
    let finish: (s: SiteSettings) => void = () => {};
    service.update.mockImplementation(() => new Promise(resolve => (finish = resolve)));
    render(<CompanySettingsForm service={service} />);
    await screen.findByLabelText(/^Company name/);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    finish(saved);
    expect(await screen.findByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("shows why a save failed, or the fallback text, and keeps what was typed", async () => {
    service.update.mockRejectedValueOnce(new Error("Org number is invalid")).mockRejectedValueOnce("nope");
    render(<CompanySettingsForm service={service} />);
    const org = await screen.findByLabelText(/^Organisation number/);
    await userEvent.clear(org);
    await userEvent.type(org, "1");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Org number is invalid"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to save"));
    expect(org).toHaveValue("1");
  });

  it("shows the API's message for each field under it, toasts the first, and clears them once a save works", async () => {
    service.update.mockRejectedValueOnce(
      await validationError({ OrgNumber: ["Not a valid organisation number."], PostalCode: ["Four digits.", "Needs a place."] }),
    );
    render(<CompanySettingsForm service={service} />);
    const org = await screen.findByLabelText(/^Organisation number/);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Not a valid organisation number."));
    expect(org).toHaveAccessibleDescription("Not a valid organisation number.");
    expect(org).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/^Postal code/)).toHaveAccessibleDescription("Four digits. Needs a place.");
    expect(screen.getByLabelText(/^Company name/)).not.toHaveAttribute("aria-invalid");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Settings saved"));
    expect(screen.queryByText("Not a valid organisation number.")).not.toBeInTheDocument();
    expect(screen.queryByText("Four digits. Needs a place.")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Organisation number/)).not.toHaveAttribute("aria-invalid");
  });

  it("drops the field errors when a later save fails without them", async () => {
    service.update.mockRejectedValueOnce(await validationError({ PublicPhone: ["Required."] })).mockRejectedValueOnce(new Error("Server down"));
    render(<CompanySettingsForm service={service} />);
    await screen.findByLabelText(/^Public phone/);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByLabelText(/^Public phone/)).toHaveAccessibleDescription("Required."));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Server down"));
    expect(screen.getByLabelText(/^Public phone/)).not.toHaveAttribute("aria-invalid");
  });

  it("says the settings could not load and offers no form to save blanks over them", async () => {
    service.get.mockRejectedValue(new Error("down"));
    render(
      <CompanySettingsForm service={service}>
        <p>branding</p>
      </CompanySettingsForm>,
    );

    expect(await screen.findByText("Failed to load settings")).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Failed to load settings");
    expect(screen.queryByLabelText(/^Company name/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(screen.queryByText("branding")).not.toBeInTheDocument();
  });

  it("does not load again when the service is inline", async () => {
    const view = render(<CompanySettingsForm service={{ ...service }} />);
    await screen.findByLabelText(/^Company name/);
    view.rerender(<CompanySettingsForm service={{ ...service }} />);

    expect(service.get).toHaveBeenCalledTimes(1);
  });

  it("uses the latest service to save", async () => {
    const view = render(<CompanySettingsForm service={service} />);
    await screen.findByLabelText(/^Company name/);
    const next = { ...service, update: vi.fn().mockResolvedValue(saved) };
    view.rerender(<CompanySettingsForm service={next} />);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(next.update).toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
  });

  it("uses the app's text, with the primary button tokens", async () => {
    render(<CompanySettingsForm service={service} strings={{ companyName: "Firmanavn", save: "Lagre", addressHint: "Fylke er valgfritt." }} />);

    expect(await screen.findByLabelText(/^Firmanavn/)).toHaveValue("NS Tuning");
    expect(screen.getByText("Fylke er valgfritt.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lagre" })).toHaveClass("rounded-button", "bg-button-primary-bg", "text-button-primary-text");
    expect(screen.getByLabelText(/^Contact enquiry recipient/)).toBeRequired();
  });
});
