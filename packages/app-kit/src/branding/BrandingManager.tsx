"use client";

import { ArrowUpTrayIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useId, useRef, useState } from "react";
import { fieldErrorTexts } from "../api/fieldErrorText";
import { toast } from "../toast";
import { FieldError } from "../ui/field";
import { withDefaults, type TextOverrides } from "../ui/withDefaults";
import { useBranding } from "./BrandingProvider";
import { defaultBrandingManagerStrings, type BrandingManagerStrings, type BrandingValidationStrings } from "./brandingManagerStrings";
import { toDataUrl } from "./types";

const IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/gif,image/x-icon,.ico";

/** Props for `BrandingManager`. */
export interface BrandingManagerProps {
  /**
   * A function that sends the form: `logo` and `icon` files, and `removeLogo` and `removeIcon` set
   * to `true`. Throw from it to show the error's message, such as one from `formatApiError`.
   */
  save: (form: FormData) => Promise<unknown>;
  /** The form's text. `validation` may name only some codes, the rest keep their defaults. */
  strings?:
    | (TextOverrides<Omit<BrandingManagerStrings, "validation">> & {
        validation?: TextOverrides<BrandingValidationStrings> | undefined;
      })
    | undefined;
}

/** A preview is an object URL for the chosen file or a data URL of a raster image. Anything else shows none. */
const PREVIEW_URL = /^(blob:|data:image\/(png|jpeg|webp|gif|x-icon|vnd\.microsoft\.icon);base64,)/i;
const previewUrl = (url: string | null): string | null => (url !== null && PREVIEW_URL.test(url) ? url : null);

interface SlotProps {
  label: string;
  hint: string;
  currentUrl: string | null;
  file: File | null;
  onPick: (file: File | null) => void;
  onClear: () => void;
  /** Why the API refused this slot's file in the last save, if it did. */
  error: string | undefined;
  text: BrandingManagerStrings;
}

function Slot({ label, hint, currentUrl, file, onPick, onClear, error, text }: SlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = `${useId()}-error`;
  const describedBy = error ? errorId : undefined;
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // An object URL is an outside resource with a lifetime, which is what an effect is for. Creating
  // it during render instead leaks the second URL that StrictMode builds when it renders twice.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const preview = previewUrl(objectUrl ?? currentUrl);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
          {preview ? (
            <img src={preview} alt={label} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-gray-400">{text.none}</span>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          // The types the API accepts, so the picker does not offer an SVG it would refuse.
          accept={IMAGE_TYPES}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="hidden"
          onChange={e => onPick(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-describedby={describedBy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium px-3 py-2 text-sm hover:bg-gray-200"
        >
          <ArrowUpTrayIcon className="h-4 w-4" /> {text.choose}
        </button>
        {(currentUrl || file) && (
          <button type="button" onClick={onClear} className="p-2 rounded-lg text-red-500 hover:bg-red-50" title={text.remove} aria-label={`${text.remove} ${label}`}>
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
      <FieldError id={errorId} error={error} />
    </div>
  );
}

/** The admin form for uploading or removing the logo and the favicon. Needs a `BrandingProvider` above it. */
export function BrandingManager({ save, strings }: BrandingManagerProps) {
  const { validation: validationOverrides, ...textOverrides } = strings ?? {};
  const text = withDefaults(defaultBrandingManagerStrings, textOverrides);
  const validation = withDefaults(defaultBrandingManagerStrings.validation, validationOverrides);
  const { branding, refresh } = useBranding();
  const [logo, setLogo] = useState<File | null>(null);
  const [icon, setIcon] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeIcon, setRemoveIcon] = useState(false);
  const [saving, setSaving] = useState(false);
  // The texts for the files the API refused in the last save, keyed by `logo` and `icon`.
  const [refusals, setRefusals] = useState<Record<string, string[]>>({});

  const currentLogo = removeLogo ? null : toDataUrl(branding.logoData, branding.logoContentType);
  const currentIcon = removeIcon ? null : toDataUrl(branding.iconData, branding.iconContentType);

  const submit = async () => {
    setSaving(true);
    try {
      const form = new FormData();
      if (logo) form.append("logo", logo);
      if (icon) form.append("icon", icon);
      if (removeLogo) form.append("removeLogo", "true");
      if (removeIcon) form.append("removeIcon", "true");
      await save(form);
      setLogo(null);
      setIcon(null);
      setRemoveLogo(false);
      setRemoveIcon(false);
      setRefusals({});
      refresh();
      toast.success(text.saved);
    } catch (err) {
      const texts = fieldErrorTexts(err, validation);
      setRefusals(texts);
      const first = Object.values(texts)[0]?.[0];
      toast.error(first ?? (err instanceof Error && err.message ? err.message : text.saveFailed));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md space-y-5 border-t border-gray-200 pt-6">
      <h2 className="font-bold text-gray-900">{text.title}</h2>
      <Slot
        label={text.logo}
        hint={text.logoHint}
        currentUrl={currentLogo}
        file={logo}
        onPick={f => { setLogo(f); setRemoveLogo(false); }}
        onClear={() => { setLogo(null); setRemoveLogo(true); }}
        error={refusals.logo?.join(" ")}
        text={text}
      />
      <Slot
        label={text.icon}
        hint={text.iconHint}
        currentUrl={currentIcon}
        file={icon}
        onPick={f => { setIcon(f); setRemoveIcon(false); }}
        onClear={() => { setIcon(null); setRemoveIcon(true); }}
        error={refusals.icon?.join(" ")}
        text={text}
      />
      <button
        type="button"
        onClick={submit}
        disabled={saving || (!logo && !icon && !removeLogo && !removeIcon)}
        className="rounded-button bg-button-primary-bg text-button-primary-text font-semibold px-5 py-2.5 hover:brightness-95 disabled:opacity-60 transition"
      >
        {saving ? text.saving : text.save}
      </button>
    </div>
  );
}
