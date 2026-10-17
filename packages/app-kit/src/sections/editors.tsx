"use client";

import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "../toast";
import { contentImagePath } from "../ui/ContentImage";
import { TextInput } from "../ui/TextInput";
import { withDefaults, type TextOverrides } from "../ui/withDefaults";
import { defaultSectionsEditorStrings, type SectionsEditorStrings } from "./sectionsEditorStrings";
import type { ContactSection, CtaSection, FeatureSection, FeedSection, HeroSection, ImageSection, StatItem, StatsSection, TextSection } from "./types";

/** How the editor uploads and previews images. */
export interface SectionImages {
  /** Uploads the file and resolves to the new image's id. */
  upload: (file: File) => Promise<{ id: string }>;
  /** The preview's URL for an image id. Defaults to `contentImagePath`. */
  src?: ((id: string) => string) | undefined;
}

/** What an editor for one section type gets. */
export interface SectionEditorProps<S> {
  section: S;
  /** Merges the changes into the section. */
  patch: (changes: Partial<S>) => void;
  strings: SectionsEditorStrings;
  images: SectionImages;
}

/** Props for `SectionField`. */
export interface SectionFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** A three-row text area instead of a one-line input. */
  textarea?: boolean | undefined;
}

/** A labeled text field for a section editor. */
export function SectionField({ label, value, onChange, textarea }: SectionFieldProps) {
  if (textarea) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <textarea
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    );
  }
  return <TextInput label={label} value={value} onChange={e => onChange(e.target.value)} />;
}

/** Props for `ImagePicker`. */
export interface ImagePickerProps {
  imageId: string | null;
  onChange: (id: string | null) => void;
  /** The label above the picker. Defaults to `strings.image`. */
  label?: string | undefined;
  images: SectionImages;
  strings?: TextOverrides<SectionsEditorStrings> | undefined;
}

/** Uploads an image and shows a preview, with a button to clear it. A failed upload shows a toast. */
export function ImagePicker({ imageId, onChange, label, images, strings }: ImagePickerProps) {
  const text = withDefaults(defaultSectionsEditorStrings, strings);
  const [uploading, setUploading] = useState(false);
  const src = images.src ?? contentImagePath;

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { id } = await images.upload(file);
      onChange(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : text.uploadFailed);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label ?? text.image}</label>
      {imageId != null && <img src={src(imageId)} alt="" className="mb-2 h-32 w-auto rounded-lg border border-gray-200 object-cover" />}
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-4 py-2 text-sm hover:bg-gray-200 transition cursor-pointer">
          {uploading ? text.uploading : imageId != null ? text.replaceImage : text.uploadImage}
          <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="hidden" />
        </label>
        {imageId != null && (
          <button type="button" onClick={() => onChange(null)} className="text-sm text-red-500 hover:text-red-700">
            {text.removeImage}
          </button>
        )}
      </div>
    </div>
  );
}

function BulletEditor({ bullets, onChange, strings }: { bullets: string[]; onChange: (bullets: string[]) => void; strings: SectionsEditorStrings }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{strings.bullets}</label>
      <div className="space-y-2">
        {bullets.map((bullet, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={bullet}
              onChange={e => onChange(bullets.map((b, j) => (j === i ? e.target.value : b)))}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button type="button" onClick={() => onChange(bullets.filter((_, j) => j !== i))} className="p-2 rounded-lg text-red-500 hover:bg-red-50">
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...bullets, ""])} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
          <PlusIcon className="h-4 w-4" /> {strings.addBullet}
        </button>
      </div>
    </div>
  );
}

/** Props for `HeroSectionEditor`. */
export interface HeroSectionEditorProps extends SectionEditorProps<HeroSection> {
  /** Extra fields between the subheading and the buttons, such as a background image picker. */
  media?: ReactNode;
}

/** Edits a hero's heading, subheading and two buttons. */
export function HeroSectionEditor({ section, patch, strings, media }: HeroSectionEditorProps) {
  return (
    <div className="space-y-4">
      <SectionField label={strings.heading} value={section.heading} onChange={v => patch({ heading: v })} />
      <SectionField label={strings.subheading} value={section.subheading} onChange={v => patch({ subheading: v })} textarea />
      {media}
      <div className="grid sm:grid-cols-2 gap-4">
        <SectionField label={strings.primaryButtonLabel} value={section.primaryLabel} onChange={v => patch({ primaryLabel: v })} />
        <SectionField label={strings.primaryButtonHref} value={section.primaryHref} onChange={v => patch({ primaryHref: v })} />
        <SectionField label={strings.secondaryButtonLabel} value={section.secondaryLabel} onChange={v => patch({ secondaryLabel: v })} />
        <SectionField label={strings.secondaryButtonHref} value={section.secondaryHref} onChange={v => patch({ secondaryHref: v })} />
      </div>
    </div>
  );
}

/** Edits a feature's heading, text and bullets. */
export function FeatureSectionEditor({ section, patch, strings }: SectionEditorProps<FeatureSection>) {
  return (
    <div className="space-y-4">
      <SectionField label={strings.heading} value={section.heading} onChange={v => patch({ heading: v })} />
      <SectionField label={strings.text} value={section.text} onChange={v => patch({ text: v })} textarea />
      <BulletEditor bullets={section.bullets} onChange={bullets => patch({ bullets })} strings={strings} />
    </div>
  );
}

/** Edits a text section's heading and Markdown body. */
export function TextSectionEditor({ section, patch, strings }: SectionEditorProps<TextSection>) {
  return (
    <div className="space-y-4">
      <SectionField label={strings.heading} value={section.heading} onChange={v => patch({ heading: v })} />
      <SectionField label={strings.body} value={section.body} onChange={v => patch({ body: v })} textarea />
    </div>
  );
}

/** Props for `FeedSectionEditor`. */
export interface FeedSectionEditorProps extends SectionEditorProps<FeedSection> {
  /** Extra fields after the count, such as a filter. */
  children?: ReactNode;
  /** The classes on the grid. Defaults to `grid sm:grid-cols-2 gap-4`. */
  className?: string | undefined;
}

/** Edits a feed's heading and how many items it shows, at least one. */
export function FeedSectionEditor({ section, patch, strings, children, className = "grid sm:grid-cols-2 gap-4" }: FeedSectionEditorProps) {
  return (
    <div className={className}>
      <SectionField label={strings.heading} value={section.heading} onChange={v => patch({ heading: v })} />
      <TextInput label={strings.count} type="number" value={section.limit.toString()} onChange={e => patch({ limit: Math.max(1, Number(e.target.value) || 1) })} />
      {children}
    </div>
  );
}

/** Edits a contact section's heading and text. */
export function ContactSectionEditor({ section, patch, strings }: SectionEditorProps<ContactSection>) {
  return (
    <div className="space-y-4">
      <SectionField label={strings.heading} value={section.heading} onChange={v => patch({ heading: v })} />
      <SectionField label={strings.text} value={section.text} onChange={v => patch({ text: v })} textarea />
    </div>
  );
}

/** Edits a call to action's heading, text and button. */
export function CtaSectionEditor({ section, patch, strings }: SectionEditorProps<CtaSection>) {
  return (
    <div className="space-y-4">
      <SectionField label={strings.heading} value={section.heading} onChange={v => patch({ heading: v })} />
      <SectionField label={strings.text} value={section.text} onChange={v => patch({ text: v })} textarea />
      <div className="grid sm:grid-cols-2 gap-4">
        <SectionField label={strings.buttonLabel} value={section.primaryLabel} onChange={v => patch({ primaryLabel: v })} />
        <SectionField label={strings.buttonHref} value={section.primaryHref} onChange={v => patch({ primaryHref: v })} />
      </div>
    </div>
  );
}

/** A live number a stats item can show. */
export interface StatSource<Live extends string> {
  value: Live;
  /** The option's name in the source list. */
  label: string;
  /** The label an item gets when it picks this source with no label yet. */
  defaultItemLabel: string;
}

/** Props for `StatsSectionEditor`. */
export interface StatsSectionEditorProps<Live extends string> extends SectionEditorProps<StatsSection<Live>> {
  /** The live sources after the manual number, in list order. */
  sources?: readonly StatSource<Live>[] | undefined;
}

/** Edits a stats band's heading and items. Each item is a manual number or one of the live sources. */
export function StatsSectionEditor<Live extends string = never>({ section, patch, strings, sources = [] }: StatsSectionEditorProps<Live>) {
  const items = section.items;
  const onChange = (next: StatItem<Live>[]) => patch({ items: next } as Partial<StatsSection<Live>>);
  const update = (i: number, changes: Partial<StatItem<Live>>) => onChange(items.map((it, j) => (j === i ? { ...it, ...changes } : it)));
  const defaults: Record<string, string> = { static: "", ...Object.fromEntries(sources.map(s => [s.value, s.defaultItemLabel])) };

  return (
    <div className="space-y-4">
      <SectionField label={strings.headingOptional} value={section.heading} onChange={v => patch({ heading: v } as Partial<StatsSection<Live>>)} />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{strings.stats}</label>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 p-3">
              <label className="text-xs text-gray-600">
                {strings.source}
                <select
                  value={item.source}
                  onChange={e => {
                    const source = e.target.value as StatItem<Live>["source"];
                    update(i, { source, ...(item.label ? {} : { label: defaults[source] ?? "" }) });
                  }}
                  className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="static">{strings.sourceStatic}</option>
                  {sources.map(s => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              {item.source === "static" && (
                <div className="w-28">
                  <TextInput label={strings.value} value={item.value} onChange={e => update(i, { value: e.target.value })} />
                </div>
              )}
              <div className="flex-1 min-w-[10rem]">
                <TextInput label={strings.label} value={item.label} onChange={e => update(i, { label: e.target.value })} />
              </div>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-2 rounded-lg text-red-500 hover:bg-red-50">
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => onChange([...items, { source: "static", value: "", label: "" }])} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            <PlusIcon className="h-4 w-4" /> {strings.addStat}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Edits an image section: the image, the layout, the alt text, and a text or a caption by layout. */
export function ImageSectionEditor({ section, patch, strings, images }: SectionEditorProps<ImageSection>) {
  const layout = section.layout ?? "standard";
  const usesText = layout === "left" || layout === "right" || layout === "overlay" || layout === "overlayFull";
  return (
    <div className="space-y-4">
      <ImagePicker imageId={section.imageId} onChange={imageId => patch({ imageId })} images={images} strings={strings} />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{strings.layout}</label>
        <select value={layout} onChange={e => patch({ layout: e.target.value as ImageSection["layout"] })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="standard">{strings.layoutStandard}</option>
          <option value="full">{strings.layoutFull}</option>
          <option value="left">{strings.layoutLeft}</option>
          <option value="right">{strings.layoutRight}</option>
          <option value="overlay">{strings.layoutOverlay}</option>
          <option value="overlayFull">{strings.layoutOverlayFull}</option>
        </select>
      </div>
      <SectionField label={strings.altText} value={section.alt} onChange={v => patch({ alt: v })} />
      {usesText && <SectionField label={strings.text} value={section.text} onChange={v => patch({ text: v })} textarea />}
      {!usesText && <SectionField label={strings.caption} value={section.caption} onChange={v => patch({ caption: v })} />}
    </div>
  );
}
