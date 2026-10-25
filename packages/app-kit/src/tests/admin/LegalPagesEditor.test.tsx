import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LegalPagesEditor, LocaleTabs, defaultLegalPageKeyLabels } from "../../admin";
import { request, type LegalPage, type LegalPageRevision, type LegalPageRevisionSummary } from "../../api";
import { nbLegalPagesEditorStrings } from "../../locales/nb";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("../../toast", () => ({ toast }));

type Key = "terms" | "privacy";
type Locale = "no" | "en";

const pages: LegalPage<Key>[] = [
  { key: "terms", locale: "no", title: "Vilkår", bodyMarkdown: "# Vilkår", updatedAt: "2026-01-01", version: "2026-01-01T00:00:00.000000Z" },
  { key: "privacy", locale: "en", title: "Privacy", bodyMarkdown: "We keep little.", updatedAt: "2026-01-02", version: "2026-01-02T00:00:00.000000Z" },
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
  it("shows the default pages with English labels when the app passes neither keys nor labels", async () => {
    render(<LegalPagesEditor service={service} locales={["no"]} localeLabels={{ no: "Norsk" }} />);
    await screen.findByLabelText(/^Title/);

    expect(screen.getAllByRole("button", { pressed: false }).map(b => b.textContent)).toEqual(["Privacy", "Cookies"]);
    expect(screen.getByRole("button", { name: "Terms" })).toHaveAttribute("aria-pressed", "true");
    expect(defaultLegalPageKeyLabels).toEqual({ terms: "Terms", privacy: "Privacy", cookies: "Cookies" });
  });

  it("takes the pages from the service's keys, and labels a page without its own label by its key", async () => {
    const own = { ...service, keys: ["refunds", "privacy"] as const };
    render(<LegalPagesEditor service={own} keyLabels={{ refunds: "Retur" }} locales={["no"]} localeLabels={{ no: "Norsk" }} />);
    await screen.findByLabelText(/^Title/);

    expect(screen.getByRole("button", { name: "Retur" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Privacy" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: "Terms" })).toBeNull();
  });

  it("prefers its own keys over the service's, and a page the default labels do not know shows its key", async () => {
    const own = { ...service, keys: ["terms"] as const };
    render(<LegalPagesEditor<string, "no"> service={own} keys={["shipping"]} locales={["no"]} localeLabels={{ no: "Norsk" }} />);
    await screen.findByLabelText(/^Title/);

    expect(screen.getByRole("button", { name: "shipping" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Terms" })).toBeNull();
  });

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

describe("LegalPagesEditor earlier versions", () => {
  const versions: LegalPageRevisionSummary[] = [
    { id: 3, savedAt: "2026-10-15T13:05:42Z", title: "Vilkår 2" },
    { id: 2, savedAt: "2026-10-15T13:05:07Z", title: "Vilkår 2" },
    { id: 1, savedAt: "2026-10-01T09:30:00Z", title: "Vilkår 1" },
  ];
  const old: LegalPageRevision = { ...versions[2], key: "terms", locale: "no", bodyMarkdown: "## Gammel tekst\n\nDette sto der **før**.", savedBy: "u1" };
  const at = (value: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
  const withHistory = () => ({ ...service, listRevisions: vi.fn().mockResolvedValue(versions), getRevision: vi.fn().mockResolvedValue(old) });
  const versionButtons = async () => within(await screen.findByRole("region", { name: "Earlier versions" })).findAllByRole("button");

  it("lists the open page's versions newest first with the date and time, and tags the newest as current", async () => {
    const history = withHistory();
    editor({ service: history, dateLocale: "en-GB" });

    const items = await versionButtons();

    expect(history.listRevisions).toHaveBeenCalledWith("terms", "no");
    expect(items.map(b => b.textContent)).toEqual([
      `${at(versions[0].savedAt)}Vilkår 2Current`,
      `${at(versions[1].savedAt)}Vilkår 2`,
      `${at(versions[2].savedAt)}Vilkår 1`,
    ]);
    // Saves in the same minute stay apart by their seconds.
    expect(items[0].textContent).toContain("42");
    expect(items[1].textContent).toContain("07");
    expect(at(versions[0].savedAt)).not.toBe(at(versions[1].savedAt));
  });

  it("opens a version read-only with its Markdown rendered, and closes it", async () => {
    const history = withHistory();
    editor({ service: history, dateLocale: "en-GB" });
    const items = await versionButtons();

    await userEvent.click(items[2]);

    const article = await screen.findByRole("article", { name: "Vilkår 1" });
    expect(history.getRevision).toHaveBeenCalledWith("terms", "no", 1);
    expect(within(article).getByRole("heading", { name: "Gammel tekst" })).toBeInTheDocument();
    expect(within(article).getByText("før").tagName).toBe("STRONG");
    expect(within(article).getByText(`Saved: ${at(versions[2].savedAt)}`)).toBeInTheDocument();
    expect(within(article).queryByRole("textbox")).toBeNull();
    expect(items[2]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Content (Markdown)")).toHaveValue("# Vilkår");

    await userEvent.click(within(article).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("says there are no earlier versions instead of hiding the section", async () => {
    const first = editor({ service: { ...service, listRevisions: vi.fn().mockResolvedValue([]) } });
    expect(await within(await screen.findByRole("region", { name: "Earlier versions" })).findByText("No earlier versions")).toBeInTheDocument();
    first.unmount();

    // A service without the calls still shows the section.
    editor();
    expect(await within(await screen.findByRole("region", { name: "Earlier versions" })).findByText("No earlier versions")).toBeInTheDocument();
  });

  it("loads the versions again after a save, and per page and locale, closing an opened version on a switch", async () => {
    const history = withHistory();
    editor({ service: history });
    await userEvent.click((await versionButtons())[1]);
    await screen.findByRole("article");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(history.listRevisions).toHaveBeenCalledTimes(2));
    await userEvent.click(screen.getByRole("button", { name: /English/ }));

    expect(history.listRevisions).toHaveBeenLastCalledWith("terms", "en");
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("says when the versions could not load, and toasts when a version cannot open", async () => {
    const first = editor({ service: { ...service, listRevisions: vi.fn().mockRejectedValue(new Error("Forbidden")) } });
    expect(await within(await screen.findByRole("region", { name: "Earlier versions" })).findByText("Failed to load the earlier versions")).toBeInTheDocument();
    first.unmount();

    const history = { ...withHistory(), getRevision: vi.fn().mockRejectedValueOnce(new Error("Not found")).mockRejectedValueOnce("nope") };
    editor({ service: history });
    const items = await versionButtons();
    await userEvent.click(items[0]);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Not found"));
    await userEvent.click(items[0]);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to open the version"));
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("disables the versions while the service cannot open them", async () => {
    editor({ service: { ...service, listRevisions: vi.fn().mockResolvedValue(versions) } });

    const items = await versionButtons();

    expect(items).toHaveLength(3);
    items.forEach(item => expect(item).toBeDisabled());
  });

  it("shows the Norwegian text", async () => {
    editor({ service: { ...service, listRevisions: vi.fn().mockResolvedValue([]) }, strings: nbLegalPagesEditorStrings });

    const region = await screen.findByRole("region", { name: "Tidligere versjoner" });
    expect(await within(region).findByText("Ingen tidligere versjoner")).toBeInTheDocument();
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
