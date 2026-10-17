// Plain values, with no "use client", so a server component can import them.

import type { SharedSectionType } from "./types";

/** The sections editor's text. Pass the app's own language. The defaults are English. */
export interface SectionsEditorStrings {
  hide: string;
  show: string;
  moveUp: string;
  moveDown: string;
  duplicate: string;
  /** The title of the button that removes a section. */
  remove: string;
  addSection: string;
  heading: string;
  headingOptional: string;
  subheading: string;
  text: string;
  body: string;
  primaryButtonLabel: string;
  primaryButtonHref: string;
  secondaryButtonLabel: string;
  secondaryButtonHref: string;
  buttonLabel: string;
  buttonHref: string;
  bullets: string;
  addBullet: string;
  count: string;
  stats: string;
  source: string;
  sourceStatic: string;
  value: string;
  label: string;
  addStat: string;
  layout: string;
  layoutStandard: string;
  layoutFull: string;
  layoutLeft: string;
  layoutRight: string;
  layoutOverlay: string;
  layoutOverlayFull: string;
  altText: string;
  caption: string;
  image: string;
  uploadImage: string;
  replaceImage: string;
  uploading: string;
  /** The button that clears the picked image. */
  removeImage: string;
  uploadFailed: string;
}

export const defaultSectionsEditorStrings: SectionsEditorStrings = {
  hide: "Hide",
  show: "Show",
  moveUp: "Move up",
  moveDown: "Move down",
  duplicate: "Duplicate",
  remove: "Remove",
  addSection: "Add section",
  heading: "Heading",
  headingOptional: "Heading (optional)",
  subheading: "Subheading",
  text: "Text",
  body: "Body (markdown)",
  primaryButtonLabel: "Primary button label",
  primaryButtonHref: "Primary button link",
  secondaryButtonLabel: "Secondary button label",
  secondaryButtonHref: "Secondary button link",
  buttonLabel: "Button label",
  buttonHref: "Button link",
  bullets: "Bullet points",
  addBullet: "Add bullet",
  count: "Number to show",
  stats: "Stats",
  source: "Source",
  sourceStatic: "Manual number",
  value: "Value",
  label: "Label",
  addStat: "Add stat",
  layout: "Layout",
  layoutStandard: "Standard (centered)",
  layoutFull: "Full width",
  layoutLeft: "Image left, text right",
  layoutRight: "Image right, text left",
  layoutOverlay: "Text over image",
  layoutOverlayFull: "Text over image (full width)",
  altText: "Alt text",
  caption: "Caption (optional)",
  image: "Image",
  uploadImage: "Upload image",
  replaceImage: "Replace image",
  uploading: "Uploading…",
  removeImage: "Remove",
  uploadFailed: "Failed to upload image",
};

/** The default name of each shared section type, on its badge and in the add list. */
export const defaultSectionTypeLabels: Record<SharedSectionType, string> = {
  hero: "Hero",
  feature: "Feature",
  text: "Text",
  feed: "Feed",
  contact: "Contact form",
  cta: "Call to action",
  stats: "Stats band",
  image: "Image",
};
