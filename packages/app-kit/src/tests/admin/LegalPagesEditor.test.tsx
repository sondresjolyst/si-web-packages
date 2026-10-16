import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LegalPagesEditor, LocaleTabs } from "../../admin";
import type { LegalPage } from "../../api";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("../../toast", () => ({ toast }));

type Key = "terms" | "privacy";
type Locale = "no" | "en";

const pages: LegalPage<Key>[] = [
  { key: "terms", locale: "no", title: "Vilkår", bodyMarkdown: "# Vilkår", updatedAt: "2026-01-01" },
  { key: "privacy", locale: "en", title: "Privacy", bodyMarkdown: "We keep little.", updatedAt: "2026-01-02" },
];

const service = { listAll: vi.fn(), save: vi.fn() };

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

    expect(service.save).toHaveBeenCalledWith("terms", "en", "Terms", "Be nice.");
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
    expect(next.save).toHaveBeenCalledWith("terms", "no", "Vilkår", "# Vilkår");
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
