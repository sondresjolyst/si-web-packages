import Link from "next/link";
import type { LegalPage } from "../api/services";
import { Markdown } from "../markdown";
import { withDefaults, type TextOverrides } from "../ui/withDefaults";

/** The legal page's text around the content. Pass the app's own language. The defaults are English. */
export interface LegalPageViewStrings {
  /** Before the date the page last changed. */
  updated: string;
  /** Shown in place of the content when nobody has written the page yet. */
  missing: string;
  /** The link back to the front page. */
  toFrontPage: string;
}

export const defaultLegalPageViewStrings: LegalPageViewStrings = {
  updated: "Last updated",
  missing: "This content has not been written yet.",
  toFrontPage: "Back to the front page",
};

export interface LegalPageViewProps {
  /** The page from the API, or null when nobody has written it yet. */
  page: LegalPage | null;
  /** The heading while there is no page. */
  title: string;
  /** The front page, for the link at the bottom. */
  homeHref: string;
  /** The BCP 47 tag the date is written in, such as `nb-NO`. */
  dateLocale: string;
  strings?: TextOverrides<LegalPageViewStrings> | undefined;
}

/** A terms, privacy or cookies page as an admin wrote it: the title, when it last changed and the Markdown body. */
export function LegalPageView({ page, title, homeHref, dateLocale, strings }: LegalPageViewProps) {
  const text = withDefaults(defaultLegalPageViewStrings, strings);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <h1 className="text-3xl font-black text-gray-900">{page?.title ?? title}</h1>
      {page && (
        <p className="text-xs text-gray-500">
          {text.updated}: {new Intl.DateTimeFormat(dateLocale, { dateStyle: "long" }).format(new Date(page.updatedAt))}
        </p>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4 text-sm text-gray-600">
        {page ? <Markdown>{page.bodyMarkdown}</Markdown> : <p>{text.missing}</p>}
      </div>

      <p className="text-xs text-gray-500">
        <Link href={homeHref} className="hover:text-gray-900 transition-colors">
          ← {text.toFrontPage}
        </Link>
      </p>
    </div>
  );
}
