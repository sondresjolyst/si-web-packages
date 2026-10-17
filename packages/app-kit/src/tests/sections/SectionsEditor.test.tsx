import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ImagePicker,
  SectionsEditor,
  StatsSectionEditor,
  cloneSection,
  createSectionFactory,
  type SectionEditorProps,
  type Sections,
  type SectionsEditorProps,
} from "../../sections";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("../../toast", () => ({ toast }));

type Section = Sections<{ hero: { backgroundImageId: string | null } }, "runs">;

const createSection = createSectionFactory<Section>({
  hero: { heading: "Heading", subheading: "", primaryLabel: "", primaryHref: "", secondaryLabel: "", secondaryHref: "", backgroundImageId: null },
  feature: { heading: "Feature", text: "", bullets: [""] },
  text: { heading: "Text heading", body: "" },
  feed: { heading: "Feed", limit: 3 },
  contact: { heading: "Contact", text: "" },
  cta: { heading: "CTA", text: "", primaryLabel: "", primaryHref: "" },
  stats: { heading: "", items: [] },
  image: { imageId: null, alt: "", caption: "", layout: "standard", text: "" },
});

const start: Section[] = [
  { id: "a", type: "text", visible: true, heading: "First", body: "" },
  { id: "b", type: "feature", visible: true, heading: "Second", text: "", bullets: ["One"] },
];

const upload = vi.fn();

// The sections from the last onChange.
let latest: Section[] = [];

function Harness(props: Partial<SectionsEditorProps<Section>> & { initial?: Section[] }) {
  const { initial = start, ...rest } = props;
  const [sections, setSections] = useState(initial);
  return (
    <SectionsEditor<Section>
      sections={sections}
      onChange={next => {
        latest = next;
        setSections(next);
      }}
      createSection={createSection}
      images={{ upload }}
      {...rest}
    />
  );
}

const headings = () => latest.map(s => ("heading" in s ? s.heading : s.type));

const card = (label: string) => screen.getByDisplayValue(label).closest(".rounded-2xl") as HTMLElement;

beforeEach(() => {
  upload.mockReset();
  toast.error.mockReset();
});

describe("SectionsEditor", () => {
  it("shows a card per section with its type badge", () => {
    render(<Harness />);
    expect(within(card("First")).getByText("Text")).toBeInTheDocument();
    expect(within(card("Second")).getByText("Feature")).toBeInTheDocument();
  });

  it("adds a section of the picked type at the end", async () => {
    render(<Harness />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "cta");
    await userEvent.click(screen.getByRole("button", { name: "Add section" }));
    expect(latest.map(s => s.type)).toEqual(["text", "feature", "cta"]);
    expect(latest[2]?.id).not.toBe("a");
  });

  it("starts the add list on the first type, or on initialAddType", async () => {
    const { unmount } = render(<Harness initial={[]} />);
    expect(screen.getByRole("combobox")).toHaveValue("hero");
    unmount();
    render(<Harness initial={[]} initialAddType="feature" types={["hero", "feature"]} />);
    expect(screen.getByRole("combobox")).toHaveValue("feature");
    expect(screen.getAllByRole("option").map(o => o.textContent)).toEqual(["Hero", "Feature"]);
    await userEvent.click(screen.getByRole("button", { name: "Add section" }));
    expect(latest.map(s => s.type)).toEqual(["feature"]);
  });

  it("removes a section", async () => {
    render(<Harness />);
    await userEvent.click(within(card("First")).getByTitle("Remove"));
    expect(headings()).toEqual(["Second"]);
  });

  it("moves a section up and down, and disables the moves at the ends", async () => {
    render(<Harness />);
    expect(within(card("First")).getByTitle("Move up")).toBeDisabled();
    expect(within(card("Second")).getByTitle("Move down")).toBeDisabled();
    await userEvent.click(within(card("First")).getByTitle("Move down"));
    expect(headings()).toEqual(["Second", "First"]);
    await userEvent.click(within(card("First")).getByTitle("Move up"));
    expect(headings()).toEqual(["First", "Second"]);
  });

  it("duplicates a section right after itself, with a new id and its own arrays", async () => {
    render(<Harness />);
    await userEvent.click(within(card("Second")).getByTitle("Duplicate"));
    expect(headings()).toEqual(["First", "Second", "Second"]);
    expect(latest[2]?.id).not.toBe("b");
    const [, original, copy] = latest;
    if (original?.type === "feature" && copy?.type === "feature") expect(copy.bullets).not.toBe(original.bullets);
  });

  it("hides and shows a section", async () => {
    render(<Harness />);
    await userEvent.click(within(card("First")).getByTitle("Hide"));
    expect(latest[0]?.visible).toBe(false);
    await userEvent.click(within(card("First")).getByTitle("Show"));
    expect(latest[0]?.visible).toBe(true);
  });

  it("edits a field through patch", async () => {
    render(<Harness />);
    const input = screen.getByDisplayValue("First");
    await userEvent.clear(input);
    await userEvent.type(input, "New");
    expect(headings()[0]).toBe("New");
  });

  it("edits bullets", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Add bullet" }));
    const feature = () => latest.find(s => s.type === "feature");
    expect(feature()).toMatchObject({ bullets: ["One", ""] });
    await userEvent.type(screen.getAllByRole("textbox").at(-1)!, "Two");
    expect(feature()).toMatchObject({ bullets: ["One", "Two"] });
  });

  it("keeps a feed's count at one or more", async () => {
    render(<Harness initial={[{ id: "f", type: "feed", visible: true, heading: "Feed", limit: 3 }]} />);
    const count = screen.getByLabelText("Number to show");
    await userEvent.clear(count);
    expect(latest[0]).toMatchObject({ limit: 1 });
  });

  it("switches an image between a caption and a text by layout", async () => {
    render(<Harness initial={[createSection("image")]} />);
    expect(screen.getByLabelText("Caption (optional)")).toBeInTheDocument();
    // The layout select keeps the apps' markup, which has no label association.
    await userEvent.selectOptions(screen.getAllByRole("combobox")[0]!, "overlay");
    expect(latest[0]).toMatchObject({ layout: "overlay" });
    expect(screen.queryByLabelText("Caption (optional)")).toBeNull();
    expect(document.querySelector("textarea")).toBeInTheDocument();
  });

  it("picks an image through the app's upload and previews it", async () => {
    upload.mockResolvedValue({ id: "img 1" });
    render(<Harness initial={[createSection("image")]} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(["x"], "car.png", { type: "image/png" }));
    await waitFor(() => expect(latest[0]).toMatchObject({ imageId: "img 1" }));
    expect(upload).toHaveBeenCalledWith(expect.any(File));
    expect(document.querySelector("img")).toHaveAttribute("src", "/content-images/img%201");
    expect(screen.getByText("Replace image")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Remove", { selector: "button.text-sm" }));
    expect(latest[0]).toMatchObject({ imageId: null });
  });

  it("shows a toast when the upload fails", async () => {
    upload.mockRejectedValue("nope");
    render(<Harness initial={[createSection("image")]} />);
    await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, new File(["x"], "car.png", { type: "image/png" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to upload image"));
    expect(latest[0]).toMatchObject({ imageId: null });
  });

  it("uses the app's strings and type labels, keeping defaults for the rest", () => {
    render(<Harness strings={{ addSection: "Legg til", remove: "Slett", heading: undefined }} typeLabels={{ text: "Tekst" }} />);
    expect(screen.getByRole("button", { name: "Legg til" })).toBeInTheDocument();
    expect(within(card("First")).getByTitle("Slett")).toBeInTheDocument();
    expect(within(card("First")).getByText("Tekst")).toBeInTheDocument();
    expect(within(card("Second")).getByText("Feature")).toBeInTheDocument();
    expect(screen.getAllByText("Heading").length).toBeGreaterThan(0);
  });

  it("lets an app replace an editor, and gives it the strings and images", async () => {
    function HeroEditor({ section, patch, strings, images }: SectionEditorProps<Extract<Section, { type: "hero" }>>) {
      return (
        <div>
          <span>{strings.heading}</span>
          <ImagePicker imageId={section.backgroundImageId} onChange={backgroundImageId => patch({ backgroundImageId })} label="Background" images={images} strings={strings} />
        </div>
      );
    }
    upload.mockResolvedValue({ id: "bg" });
    render(<Harness initial={[createSection("hero")]} editors={{ hero: HeroEditor }} />);
    expect(screen.getByText("Background")).toBeInTheDocument();
    await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, new File(["x"], "bg.png", { type: "image/png" }));
    await waitFor(() => expect(latest[0]).toMatchObject({ backgroundImageId: "bg" }));
  });

  it("offers the app's live stats sources and fills in their label", async () => {
    const Stats = (props: SectionEditorProps<Extract<Section, { type: "stats" }>>) => <StatsSectionEditor<"runs"> {...props} sources={[{ value: "runs", label: "Runs (live)", defaultItemLabel: "Runs published" }]} />;
    render(<Harness initial={[createSection("stats")]} editors={{ stats: Stats }} />);
    await userEvent.click(screen.getByRole("button", { name: "Add stat" }));
    expect(screen.getByLabelText("Value")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Source"), "runs");
    expect(latest[0]).toMatchObject({ items: [{ source: "runs", value: "", label: "Runs published" }] });
    expect(screen.queryByLabelText("Value")).toBeNull();
    await userEvent.click(within(screen.getByLabelText("Label").closest(".rounded-lg") as HTMLElement).getByRole("button"));
    expect(latest[0]).toMatchObject({ items: [] });
  });

  it("renders without the wrapping element when unwrapped", () => {
    const { container, unmount } = render(<Harness />);
    expect(container.firstElementChild).toHaveClass("space-y-4");
    unmount();
    const { container: bare } = render(<Harness unwrapped />);
    expect(bare.children).toHaveLength(3);
  });
});

describe("createSectionFactory and cloneSection", () => {
  it("gives each new section its own id and its own copy of the fields", () => {
    const a = createSection("feature");
    const b = createSection("feature");
    expect(a.id).not.toBe(b.id);
    expect(a).toMatchObject({ type: "feature", visible: true, bullets: [""] });
    if (a.type === "feature" && b.type === "feature") expect(a.bullets).not.toBe(b.bullets);
  });

  it("copies a section deeply with a new id", () => {
    const original = start[1]!;
    const copy = cloneSection(original);
    expect(copy).toEqual({ ...original, id: copy.id });
    expect(copy.id).not.toBe(original.id);
  });
});
