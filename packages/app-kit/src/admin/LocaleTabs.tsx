"use client";

export interface LocaleTabsProps<L extends string> {
  locales: readonly L[];
  /** Each locale's tab label, such as `Norsk`. */
  labels: Record<L, string>;
  active: L;
  onChange: (locale: L) => void;
  /** Which locales have content. A locale marked false gets a dot titled `notFilled`. */
  filled?: Partial<Record<L, boolean>> | undefined;
  /** The dot's title, such as "Not filled in". */
  notFilled?: string | undefined;
}

/** Tabs for editing one translation at a time. */
export function LocaleTabs<L extends string>({ locales, labels, active, onChange, filled, notFilled = "Not filled in" }: LocaleTabsProps<L>) {
  return (
    <div className="flex items-center gap-1 border-b border-gray-200">
      {locales.map(locale => (
        <button
          key={locale}
          type="button"
          onClick={() => onChange(locale)}
          aria-pressed={locale === active}
          className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            locale === active ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          {labels[locale]}
          {filled?.[locale] === false && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 align-middle" title={notFilled} />}
        </button>
      ))}
    </div>
  );
}
