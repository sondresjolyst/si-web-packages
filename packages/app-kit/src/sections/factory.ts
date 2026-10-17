import type { BaseSection, SectionOf } from "./types";

let counter = 0;

/** A new section id, unique within the page. */
function newSectionId(): string {
  return `s-${Date.now()}-${counter++}`;
}

/** The starting fields of each section type, without the id, the type and `visible`. */
export type SectionTemplates<S extends BaseSection> = {
  [K in S["type"]]: Omit<SectionOf<S, K>, "id" | "type" | "visible">;
};

/**
 * Builds the app's `createSection` from its starting fields. Each call gets a new id and its own
 * copy of the fields, so two sections never share an array.
 */
export function createSectionFactory<S extends BaseSection>(templates: SectionTemplates<S>): (type: S["type"]) => S {
  return type => ({ id: newSectionId(), visible: true, type, ...structuredClone(templates[type as S["type"]]) }) as unknown as S;
}

/** A deep copy of the section with a new id. */
export function cloneSection<S extends BaseSection>(section: S): S {
  return { ...structuredClone(section), id: newSectionId() };
}
