"use client";

import { useEffect, useRef, useState } from "react";
import { fieldErrorTexts } from "../api/fieldErrorText";
import type { LegalPage } from "../api/services";
import { toast } from "../toast";
import { FieldError } from "../ui/field";
import { TextInput } from "../ui/TextInput";
import { withDefaults, type TextOverrides } from "../ui/withDefaults";
import { defaultLegalPagesEditorStrings, type LegalPagesEditorStrings, type LegalPagesValidationStrings } from "./legalPagesEditorStrings";
import { LocaleTabs } from "./LocaleTabs";

/** Props for `LegalPagesEditor`. */
export interface LegalPagesEditorProps<K extends string, L extends string> {
  /** The legal page calls, such as `createLegalService(api, publicApi)`. */
  service: {
    listAll: () => Promise<LegalPage<K>[]>;
    save: (page: { key: K; locale: L; title: string; bodyMarkdown: string }) => Promise<unknown>;
  };
  /** The pages, in tab order. The editor opens on the first. */
  keys: readonly K[];
  /** Each page's tab label, such as `Terms`. */
  keyLabels: Record<K, string>;
  /** The locales each page is written in. The editor opens on the first. */
  locales: readonly L[];
  /** Each locale's tab label, such as `Norsk`. */
  localeLabels: Record<L, string>;
  /** The editor's text. `validation` may name only some codes, the rest keep their defaults. */
  strings?:
    | (TextOverrides<Omit<LegalPagesEditorStrings, "validation">> & {
        validation?: TextOverrides<LegalPagesValidationStrings> | undefined;
      })
    | undefined;
}

type Draft = { title: string; bodyMarkdown: string };

const emptyDraft: Draft = { title: "", bodyMarkdown: "" };

/** The admin editor for the legal pages: one page and one locale at a time, with the title and the Markdown body. */
export function LegalPagesEditor<K extends string, L extends string>({ service, keys, keyLabels, locales, localeLabels, strings }: LegalPagesEditorProps<K, L>) {
  const { validation: validationOverrides, ...textOverrides } = strings ?? {};
  const text = withDefaults(defaultLegalPagesEditorStrings, textOverrides);
  const validation = withDefaults(defaultLegalPagesEditorStrings.validation, validationOverrides);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [activeKey, setActiveKey] = useState<K | undefined>(keys[0]);
  const [activeLocale, setActiveLocale] = useState<L | undefined>(locales[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  // The per-field texts from the last failed save, with the page and locale they belong to.
  const [fieldErrors, setFieldErrors] = useState<{ slot: string; fields: Record<string, string[]> } | null>(null);
  // The latest service, so an inline one does not load the pages again on every render.
  const serviceRef = useRef(service);
  useEffect(() => {
    serviceRef.current = service;
  }, [service]);

  useEffect(() => {
    serviceRef.current
      .listAll()
      .then(pages => setDrafts(Object.fromEntries(pages.map(p => [`${p.key}:${p.locale}`, { title: p.title, bodyMarkdown: p.bodyMarkdown }]))))
      .catch((err: unknown) => {
        // No editor without the saved pages, since saving a blank one would erase it.
        setFailed(true);
        toast.error(err instanceof Error && err.message ? err.message : text.loadFailed);
      })
      .finally(() => setLoading(false));
  }, [text.loadFailed]);

  if (activeKey === undefined || activeLocale === undefined) return null;

  const slot = `${activeKey}:${activeLocale}`;
  const draft = drafts[slot] ?? emptyDraft;
  const errorFor = (field: keyof Draft) => (fieldErrors?.slot === slot ? fieldErrors.fields[field]?.join(" ") : undefined);
  const bodyError = errorFor("bodyMarkdown");

  const patch = (changes: Partial<Draft>) => setDrafts(prev => ({ ...prev, [slot]: { ...(prev[slot] ?? emptyDraft), ...changes } }));

  const save = async () => {
    const blank = (Object.keys(emptyDraft) as (keyof Draft)[]).filter(field => draft[field].trim() === "");
    if (blank.length > 0) {
      setFieldErrors({ slot, fields: Object.fromEntries(blank.map(field => [field, [validation.required]])) });
      toast.error(text.required);
      return;
    }
    setSaving(true);
    try {
      await serviceRef.current.save({ key: activeKey, locale: activeLocale, title: draft.title.trim(), bodyMarkdown: draft.bodyMarkdown });
      setFieldErrors(null);
      toast.success(text.saved);
    } catch (err) {
      const fields = fieldErrorTexts(err, validation);
      setFieldErrors({ slot, fields });
      const first = Object.values(fields)[0]?.[0];
      toast.error(first ?? (err instanceof Error && err.message ? err.message : text.saveFailed));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500">{text.loading}</p>;
  if (failed) return <p className="text-gray-500">{text.loadFailed}</p>;

  const filled = Object.fromEntries(locales.map(l => [l, (drafts[`${activeKey}:${l}`]?.bodyMarkdown ?? "") !== ""])) as Record<L, boolean>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">{text.heading}</h2>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-button bg-button-primary-bg text-button-primary-text font-semibold px-5 py-2 text-sm hover:brightness-95 disabled:opacity-60 transition"
        >
          {saving ? text.saving : text.save}
        </button>
      </div>

      <div className="flex gap-1">
        {keys.map(key => (
          <button
            key={key}
            onClick={() => setActiveKey(key)}
            aria-pressed={key === activeKey}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${key === activeKey ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            {keyLabels[key]}
          </button>
        ))}
      </div>

      <LocaleTabs locales={locales} labels={localeLabels} active={activeLocale} onChange={setActiveLocale} filled={filled} notFilled={text.notFilled} />

      <TextInput label={text.title} error={errorFor("title")} value={draft.title} onChange={e => patch({ title: e.target.value })} />

      <div>
        <label htmlFor="legal-body" className="block text-sm font-medium text-gray-700 mb-1">
          {text.bodyMarkdown}
        </label>
        <textarea
          id="legal-body"
          rows={24}
          value={draft.bodyMarkdown}
          onChange={e => patch({ bodyMarkdown: e.target.value })}
          aria-invalid={bodyError ? true : undefined}
          aria-describedby={bodyError ? "legal-body-error" : undefined}
          className={`w-full rounded-lg border ${bodyError ? "border-input-border-error" : "border-gray-300"} px-3 py-2 font-mono text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary`}
        />
        <FieldError id="legal-body-error" error={bodyError} />
      </div>
    </div>
  );
}
