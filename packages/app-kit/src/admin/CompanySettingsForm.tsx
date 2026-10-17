"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { apiFieldErrors } from "../api/apiFieldErrors";
import type { SiteSettings } from "../api/services";
import { toast } from "../toast";
import { TextInput } from "../ui/TextInput";
import { Toggle } from "../ui/Toggle";
import { withDefaults, type TextOverrides } from "../ui/withDefaults";
import { defaultCompanySettingsFormStrings, type CompanySettingsFormStrings } from "./companySettingsFormStrings";

/** Props for `CompanySettingsForm`. */
export interface CompanySettingsFormProps {
  /** The settings calls, such as `createSettingsService(api)`. */
  service: { get: () => Promise<SiteSettings>; update: (settings: SiteSettings) => Promise<SiteSettings> };
  strings?: TextOverrides<CompanySettingsFormStrings> | undefined;
  /** The content shown below the form once the settings have loaded, such as the `BrandingManager`. */
  children?: ReactNode;
}

const EMPTY: SiteSettings = {
  contactRecipientEmail: "",
  companyName: "",
  companyLegalName: "",
  orgNumber: "",
  vatRegistered: false,
  streetAddress: "",
  postalCode: "",
  addressLocality: "",
  addressRegion: "",
  publicEmail: "",
  publicPhone: "",
};

/**
 * The admin form for the business details the public pages show: the contact recipient, names, org
 * number and VAT, the address in parts, and the public email and phone.
 */
export function CompanySettingsForm({ service, strings, children }: CompanySettingsFormProps) {
  const text = withDefaults(defaultCompanySettingsFormStrings, strings);
  const [settings, setSettings] = useState<SiteSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  // The API's per-field messages from the last failed save, keyed by field name.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  // The latest service, so an inline one does not load the settings again on every render.
  const serviceRef = useRef(service);
  useEffect(() => {
    serviceRef.current = service;
  }, [service]);

  useEffect(() => {
    serviceRef.current
      .get()
      .then(setSettings)
      .catch(() => {
        // No form without the saved settings, since saving a blank one would erase them.
        setFailed(true);
        toast.error(text.loadFailed);
      })
      .finally(() => setLoading(false));
  }, [text.loadFailed]);

  const patch = (changes: Partial<SiteSettings>) => setSettings(prev => ({ ...prev, ...changes }));
  const errorFor = (field: keyof SiteSettings) => fieldErrors[field]?.join(" ");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      setSettings(await serviceRef.current.update(settings));
      setFieldErrors({});
      toast.success(text.saved);
    } catch (err) {
      setFieldErrors(apiFieldErrors(err) ?? {});
      toast.error(err instanceof Error && err.message ? err.message : text.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-500">{text.loading}</p>;
  if (failed) return <p className="text-gray-500">{text.loadFailed}</p>;

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <TextInput
          label={text.contactRecipient}
          name="contactRecipientEmail"
          error={errorFor("contactRecipientEmail")}
          type="email"
          value={settings.contactRecipientEmail}
          onChange={e => patch({ contactRecipientEmail: e.target.value })}
          required
        />
        <p className="text-xs text-gray-500">{text.contactRecipientHint}</p>

        <TextInput label={text.companyName} name="companyName" error={errorFor("companyName")} value={settings.companyName} onChange={e => patch({ companyName: e.target.value })} required />
        <TextInput label={text.legalName} name="companyLegalName" error={errorFor("companyLegalName")} value={settings.companyLegalName} onChange={e => patch({ companyLegalName: e.target.value })} />
        <p className="text-xs text-gray-500">{text.legalNameHint}</p>

        <TextInput label={text.orgNumber} name="orgNumber" error={errorFor("orgNumber")} value={settings.orgNumber} onChange={e => patch({ orgNumber: e.target.value })} />
        <Toggle label={text.vatRegistered} checked={settings.vatRegistered} onChange={v => patch({ vatRegistered: v })} />
        <p className="text-xs text-gray-500">{text.vatHint}</p>

        <TextInput label={text.streetAddress} name="streetAddress" error={errorFor("streetAddress")} value={settings.streetAddress} onChange={e => patch({ streetAddress: e.target.value })} required />
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <TextInput label={text.postalCode} name="postalCode" error={errorFor("postalCode")} inputMode="numeric" value={settings.postalCode} onChange={e => patch({ postalCode: e.target.value })} />
          <TextInput label={text.addressLocality} name="addressLocality" error={errorFor("addressLocality")} value={settings.addressLocality} onChange={e => patch({ addressLocality: e.target.value })} />
        </div>
        <TextInput label={text.addressRegion} name="addressRegion" error={errorFor("addressRegion")} value={settings.addressRegion} onChange={e => patch({ addressRegion: e.target.value })} />
        <p className="text-xs text-gray-500">{text.addressHint}</p>
        <TextInput label={text.publicEmail} name="publicEmail" error={errorFor("publicEmail")} type="email" value={settings.publicEmail} onChange={e => patch({ publicEmail: e.target.value })} required />
        <TextInput label={text.publicPhone} name="publicPhone" error={errorFor("publicPhone")} value={settings.publicPhone} onChange={e => patch({ publicPhone: e.target.value })} required />

        <button
          type="submit"
          disabled={saving}
          className="rounded-button bg-button-primary-bg text-button-primary-text font-semibold px-5 py-2.5 hover:brightness-95 disabled:opacity-60 transition"
        >
          {saving ? text.saving : text.save}
        </button>
      </form>

      {children}
    </div>
  );
}
