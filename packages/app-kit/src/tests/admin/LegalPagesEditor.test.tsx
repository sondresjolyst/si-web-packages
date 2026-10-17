import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LegalPagesEditor, LocaleTabs } from "../../admin";
import { request, type LegalPage } from "../../api";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("../../toast", () => ({ toast }));

type Key = "terms" | "privacy";
type Locale = "no" | "en";

const pages: LegalPage<Key>[] = [
  { key: "terms", locale: "no", title: "Vilkår", bodyMarkdown: "# Vilkår", updatedAt: "2026-01-01" },
  { key: "privacy", locale: "en", title: "Privacy", bodyMarkdown: "We keep little.", updatedAt: "2026-01-02" },
];

const service = { listAll: vi.fn(), save: vi.fn() };

// The Error that `request` throws for an ASP.NET validation problem, with the codes and limits extensions when given.
const validationError = (errors: Record<string, string[]>, extensions: { codes?: Record<string, string[]>; limits?: Record<string, number> } = {}) =>
  request(
    () =>
      Promise.reject(
        Object.assign(new Error("Request failed with status code 400"), {
          isAxiosError: true,
          response: { status: 400, data: { title: "One or more validation errors occurred.", errors, ...extensions } },
        }),
      ),
    "Failed",
  ).catch((e: unknown) => e);

const editor = (props: Partial<Parameters<typeof LegalPagesEditor<Key, Locale>>[0]> = {}) =>
  render(
    <LegalPagesEditor<Key, Locale>
      service={service}
      keys={["terms", "privacy"]}
      keyLabels={{ terms: "Terms", privacy: "Privacy" }}
      locales={["no", "en"]}
      localeLabels={{ no: "Norsk", en: "English" }}
      {...props}
    />,
  );

beforeEach(() => {
  service.listAll.mockReset().mockResolvedValue(pages);
  service.save.mockReset().mockResolvedValue(undefined);
  toast.success.mockReset();
  toast.error.mockReset();
});

describe("LegalPagesEditor", () => {
  it("opens on the first page in the first locale, with what was saved", async () => {
    editor();

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(await screen.findByLabelText(/^Title/)).toHaveValue("Vilkår");
    expect(screen.getByLabelText("Content (Markdown)")).toHaveValue("# Vilkår");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Legal pages");
    expect(screen.getByRole("button", { name: "Terms" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Norsk/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("marks the locales of the open page that have no content", async () => {
    editor();
    await screen.findByLabelText(/^Title/);

    expect(screen.getByRole("button", { name: /English/ }).querySelector("[title='Not filled in']")).not.toBeNull();
    expect(screen.getByRole("button", { name: /Norsk/ }).querySelector("[title]")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Privacy" }));
    expect(screen.getByRole("button", { name: /Norsk/ }).querySelector("[title='Not filled in']")).not.toBeNull();
    expect(screen.getByRole("button", { name: /English/ }).querySelector("[title]")).toBeNull();
  });

  it("switches page and locale, keeping each draft apart", async () => {
    editor();
    const title = await screen.findByLabelText(/^Title/);

    await userEvent.type(title, " (ny)");
    await userEvent.click(screen.getByRole("button", { name: /English/ }));
    expect(screen.getByLabelText(/^Title/)).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Privacy" }));
    expect(screen.getByLabelText(/^Title/)).toHaveValue("Privacy");
    await userEvent.click(screen.getByRole("button", { name: "Terms" }));
    await userEvent.click(screen.getByRole("button", { name: /Norsk/ }));
    expect(screen.getByLabelText(/^Title/)).toHaveValue("Vilkår (ny)");
  });

  it("saves the open page with a trimmed title and says so", async () => {
    editor();
    await screen.findByLabelText(/^Title/);
    await userEvent.click(screen.getByRole("button", { name: /English/ }));

    await userEvent.type(screen.getByLabelText(/^Title/), "  Terms  ");
    await userEvent.type(screen.getByLabelText("Content (Markdown)"), "Be nice.");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(service.save).toHaveBeenCalledWith({ key: "terms", locale: "en", title: "Terms", bodyMarkdown: "Be nice." });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Page saved"));
    expect(screen.getByRole("button", { name: /English/ }).querySelector("[title]")).toBeNull();
  });

  it("refuses a page without a title or content", async () => {
    editor();
    await screen.findByLabelText(/^Title/);
    await userEvent.clear(screen.getByLabelText("Content (Markdown)"));
    await userEvent.type(screen.getByLabelText("Content (Markdown)"), "   ");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await userEvent.click(screen.getByRole("button", { name: /English/ }));
    await userEvent.type(screen.getByLabelText("Content (Markdown)"), "Body");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(toast.error).toHaveBeenCalledTimes(2);
    expect(toast.error).toHaveBeenCalledWith("Fill in the title and the content");
    expect(service.save).not.toHaveBeenCalled();
  });

  it("marks each blank field with the app's required text before it calls the API", async () => {
    editor({ strings: { validation: { required: "Feltet må fylles ut" } } });
    await screen.findByLabelText(/^Title/);
    await userEvent.clear(screen.getByLabelText("Content (Markdown)"));
    await userEvent.type(screen.getByLabelText("Content (Markdown)"), "  ");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("Content (Markdown)")).toHaveAccessibleDescription("Feltet må fylles ut");
    expect(screen.getByLabelText("Content (Markdown)")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(/^Title/)).not.toHaveAttribute("aria-invalid");
    expect(toast.error).toHaveBeenCalledWith("Fill in the title and the content");

    await userEvent.clear(screen.getByLabelText(/^Title/));
    await userEvent.type(screen.getByLabelText("Content (Markdown)"), "Body");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText(/^Title/)).toHaveAccessibleDescription("Feltet må fylles ut");
    expect(screen.getByLabelText("Content (Markdown)")).not.toHaveAttribute("aria-invalid");
    expect(service.save).not.toHaveBeenCalled();
  });

  it("marks both fields in English by default when both are blank", async () => {
    editor();
    await screen.findByLabelText(/^Title/);
    await userEvent.click(screen.getByRole("button", { name: /English/ }));

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText(/^Title/)).toHaveAccessibleDescription("Required.");
    expect(screen.getByLabelText("Content (Markdown)")).toHaveAccessibleDescription("Required.");
  });

  it("disables saving while it runs, and explains a failure", async () => {
    let fail: (e: unknown) => void = () => {};
    service.save.mockImplementationOnce(() => new Promise((_, reject) => (fail = reject))).mockRejectedValueOnce("nope");
    editor();
    await screen.findByLabelText(/^Title/);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    fail(new Error("Too long"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Too long"));
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to save the page"));
  });

  it("shows the API's errors under their fields for the page they belong to, and clears them once a save works", async () => {
    service.save.mockRejectedValueOnce(await validationError({ Title: ["At most 200 characters."], BodyMarkdown: ["Required."] }));
    editor();
    await screen.findByLabelText(/^Title/);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("At most 200 characters."));
    expect(screen.getByLabelText(/^Title/)).toHaveAccessibleDescription("At most 200 characters.");
    expect(screen.getByLabelText("Content (Markdown)")).toHaveAccessibleDescription("Required.");
    expect(screen.getByLabelText("Content (Markdown)")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Content (Markdown)")).toHaveClass("border-input-border-error");

    await userEvent.click(screen.getByRole("button", { name: "Privacy" }));
    expect(screen.queryByText("At most 200 characters.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Content (Markdown)")).not.toHaveAttribute("aria-invalid");
    await userEvent.click(screen.getByRole("button", { name: "Terms" }));
    expect(screen.getByText("At most 200 characters.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Page saved"));
    expect(screen.queryByText("At most 200 characters.")).not.toBeInTheDocument();
    expect(screen.queryByText("Required.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Content (Markdown)")).toHaveClass("border-gray-300");
  });

  it("shows the app's text for a code it knows, with the limit, and the API's message for one it does not", async () => {
    service.save.mockRejectedValueOnce(
      await validationError(
        { Title: ["At most 200 characters."], BodyMarkdown: ["Something new."] },
        { codes: { Title: ["tooLong"], BodyMarkdown: ["somethingNew"] }, limits: { Title: 200 } },
      ),
    );
    editor({ strings: { validation: { tooLong: "Bruk {max} eller færre tegn" } } });
    await screen.findByLabelText(/^Title/);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Bruk 200 eller færre tegn"));
    expect(screen.getByLabelText(/^Title/)).toHaveAccessibleDescription("Bruk 200 eller færre tegn");
    expect(screen.getByLabelText("Content (Markdown)")).toHaveAccessibleDescription("Something new.");
  });

  it("uses the app's required text for the API's required code and keeps the other defaults", async () => {
    service.save
      .mockRejectedValueOnce(await validationError({ BodyMarkdown: ["Required."] }, { codes: { BodyMarkdown: ["required"] } }))
      .mockRejectedValueOnce(await validationError({ Title: ["Too long."] }, { codes: { Title: ["tooLong"] }, limits: { Title: 150 } }))
      .mockRejectedValueOnce(await validationError({ Title: ["Too long."] }, { codes: { Title: ["tooLong"] } }));
    editor({ strings: { validation: { required: "Feltet må fylles ut" } } });
    await screen.findByLabelText(/^Title/);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Feltet må fylles ut"));
    expect(screen.getByLabelText("Content (Markdown)")).toHaveAccessibleDescription("Feltet må fylles ut");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("At most 150 characters."));
    expect(screen.getByLabelText("Content (Markdown)")).not.toHaveAttribute("aria-invalid");

    // Without a limit to fill in, the API's own message.
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Too long."));
    expect(screen.getByLabelText(/^Title/)).toHaveAccessibleDescription("Too long.");
  });

  it("says why the pages could not load, or the fallback text", async () => {
    service.listAll.mockRejectedValueOnce(new Error("Forbidden"));
    const first = editor();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Forbidden"));
    expect(await screen.findByText("Failed to load the legal pages")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Title/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    first.unmount();

    service.listAll.mockRejectedValueOnce("nope");
    editor({ strings: { loadFailed: "Kunne ikke laste sidene" } });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Kunne ikke laste sidene"));
  });

  it("does not load again for an inline service, and saves with the latest", async () => {
    const view = editor({ service: { ...service } });
    await screen.findByLabelText(/^Title/);
    const next = { ...service, save: vi.fn().mockResolvedValue(undefined) };
    view.rerender(
      <LegalPagesEditor<Key, Locale> service={next} keys={["terms", "privacy"]} keyLabels={{ terms: "Terms", privacy: "Privacy" }} locales={["no", "en"]} localeLabels={{ no: "Norsk", en: "English" }} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(service.listAll).toHaveBeenCalledTimes(1);
    expect(next.save).toHaveBeenCalledWith({ key: "terms", locale: "no", title: "Vilkår", bodyMarkdown: "# Vilkår" });
  });

  it("uses the app's text and the primary button tokens", async () => {
    editor({ strings: { heading: "Juridiske sider", title: "Tittel", save: "Lagre", notFilled: "Ikke fylt ut" } });

    expect(await screen.findByLabelText(/^Tittel/)).toHaveValue("Vilkår");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Juridiske sider");
    expect(screen.getByRole("button", { name: "Lagre" })).toHaveClass("rounded-button", "bg-button-primary-bg");
    expect(screen.getByRole("button", { name: /English/ }).querySelector("[title='Ikke fylt ut']")).not.toBeNull();
  });

  it("renders nothing without pages or locales", () => {
    const { container } = editor({ keys: [] });
    expect(container).toBeEmptyDOMElement();
  });
});

describe("LocaleTabs", () => {
  it("shows a tab per locale, marks the active one and reports a click", async () => {
    const onChange = vi.fn();
    render(<LocaleTabs locales={["no", "en"] as const} labels={{ no: "Norsk", en: "English" }} active="no" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "Norsk" })).toHaveClass("border-gray-900");
    expect(screen.getByRole("button", { name: "English" })).toHaveClass("border-transparent");
    await userEvent.click(screen.getByRole("button", { name: "English" }));
    expect(onChange).toHaveBeenCalledWith("en");
    expect(screen.queryByTitle("Not filled in")).not.toBeInTheDocument();
  });
});
