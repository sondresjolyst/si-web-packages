"use client";

import { ArrowDownIcon, ArrowUpIcon, DocumentDuplicateIcon, EyeIcon, EyeSlashIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useState, type ComponentType } from "react";
import { withDefaults, type TextOverrides } from "../ui/withDefaults";
import {
  ContactSectionEditor,
  CtaSectionEditor,
  FeatureSectionEditor,
  FeedSectionEditor,
  HeroSectionEditor,
  ImageSectionEditor,
  StatsSectionEditor,
  TextSectionEditor,
  type SectionEditorProps,
  type SectionImages,
} from "./editors";
import { cloneSection as defaultClone } from "./factory";
import { defaultSectionsEditorStrings, defaultSectionTypeLabels, type SectionsEditorStrings } from "./sectionsEditorStrings";
import { SHARED_SECTION_TYPES, type BaseSection, type SectionOf } from "./types";

/** An editor per section type. An app's editors replace the defaults for the same type. */
export type SectionEditors<S extends BaseSection> = {
  [K in S["type"]]?: ComponentType<SectionEditorProps<SectionOf<S, K>>>;
};

/** The editors for the shared types. The stats editor offers only the manual number until the app registers its sources. */
export const defaultSectionEditors = {
  hero: HeroSectionEditor,
  feature: FeatureSectionEditor,
  text: TextSectionEditor,
  feed: FeedSectionEditor,
  contact: ContactSectionEditor,
  cta: CtaSectionEditor,
  stats: StatsSectionEditor,
  image: ImageSectionEditor,
};

/** Props for `SectionsEditor`. */
export interface SectionsEditorProps<S extends BaseSection> {
  sections: S[];
  onChange: (sections: S[]) => void;
  /** Makes a new section of the type, such as one from `createSectionFactory`. */
  createSection: (type: S["type"]) => S;
  /** Copies a section with a new id. Defaults to `cloneSection`. */
  cloneSection?: ((section: S) => S) | undefined;
  /** The types the add list offers, in order. Defaults to every shared type. */
  types?: readonly S["type"][] | undefined;
  /** The type the add list starts on. Defaults to the first of `types`. */
  initialAddType?: S["type"] | undefined;
  /** The app's editors. They replace the defaults for the same type, and add the app's own types. */
  editors?: SectionEditors<S> | undefined;
  images: SectionImages;
  strings?: TextOverrides<SectionsEditorStrings> | undefined;
  /** The name of each type, on its badge and in the add list. Missing types keep the default, or show the type itself. */
  typeLabels?: Partial<Record<S["type"], string>> | undefined;
  /** Renders the cards and the add row without the wrapping element, for a page that already spaces its children. */
  unwrapped?: boolean | undefined;
}

/**
 * The admin editor for a page of sections. It is controlled: every change, whether an edit, a
 * move, a copy, a removal or a new section, goes out through `onChange`.
 */
export function SectionsEditor<S extends BaseSection>({
  sections,
  onChange,
  createSection,
  cloneSection = defaultClone,
  types = SHARED_SECTION_TYPES as readonly string[] as readonly S["type"][],
  initialAddType,
  editors,
  images,
  strings,
  typeLabels,
  unwrapped = false,
}: SectionsEditorProps<S>) {
  const text = withDefaults(defaultSectionsEditorStrings, strings);
  const [addType, setAddType] = useState<S["type"] | undefined>(initialAddType ?? types[0]);
  const labels: Record<string, string | undefined> = { ...defaultSectionTypeLabels, ...typeLabels };
  const label = (type: string) => labels[type] ?? type;
  const allEditors = { ...defaultSectionEditors, ...editors } as unknown as Record<string, ComponentType<SectionEditorProps<S>> | undefined>;

  const patch = (id: string, changes: Partial<S>) => onChange(sections.map(s => (s.id === id ? ({ ...s, ...changes } as S) : s)));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const duplicate = (index: number) => {
    const next = [...sections];
    next.splice(index + 1, 0, cloneSection(sections[index]));
    onChange(next);
  };

  const content = (
    <>
      {sections.map((section, index) => {
        const Editor = allEditors[section.type];
        return (
          <div key={section.id} className="rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{label(section.type)}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => patch(section.id, { visible: !section.visible } as Partial<S>)} title={section.visible ? text.hide : text.show} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                  {section.visible ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} title={text.moveUp} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30">
                  <ArrowUpIcon className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === sections.length - 1} title={text.moveDown} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30">
                  <ArrowDownIcon className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => duplicate(index)} title={text.duplicate} className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                  <DocumentDuplicateIcon className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => onChange(sections.filter(s => s.id !== section.id))} title={text.remove} className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            {Editor && <Editor section={section} patch={changes => patch(section.id, changes)} strings={text} images={images} />}
          </div>
        );
      })}

      <div className="flex items-center gap-2 pt-2">
        <select value={addType} onChange={e => setAddType(e.target.value as S["type"])} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          {types.map(t => (
            <option key={t} value={t}>
              {label(t)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => addType !== undefined && onChange([...sections, createSection(addType)])}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-200 transition"
        >
          <PlusIcon className="h-4 w-4" /> {text.addSection}
        </button>
      </div>
    </>
  );

  return unwrapped ? content : <div className="space-y-4">{content}</div>;
}
