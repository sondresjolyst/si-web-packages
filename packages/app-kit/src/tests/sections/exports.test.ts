import { describe, expect, it } from "vitest";
import * as sections from "../../sections";

describe("the sections entry point", () => {
  it("exports what an app needs to add its own section types, and none of the plumbing", () => {
    expect(Object.keys(sections).sort()).toEqual([
      "ContactSectionEditor",
      "CtaSectionEditor",
      "FeatureSectionEditor",
      "FeedSectionEditor",
      "HeroSectionEditor",
      "ImagePicker",
      "ImageSectionEditor",
      "SHARED_SECTION_TYPES",
      "SectionField",
      "SectionRenderer",
      "SectionsEditor",
      "SmartLink",
      "StatsSectionEditor",
      "TextSectionEditor",
      "cloneSection",
      "createContactRenderer",
      "createImageRenderer",
      "createSectionFactory",
      "createTextRenderer",
      "ctaRenderer",
      "defaultSectionTypeLabels",
      "defaultSectionsEditorStrings",
      "featureRenderer",
      "heroRenderer",
    ]);
  });
});
