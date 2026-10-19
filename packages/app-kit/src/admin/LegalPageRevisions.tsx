"use client";

import { useEffect, useRef, useState } from "react";
import type { LegalPageRevision, LegalPageRevisionSummary } from "../api/legalPage";
import { Markdown } from "../markdown";
import { parseTimestamp } from "../seo/sitemap";
import { toast } from "../toast";
import type { LegalPagesEditorStrings } from "./legalPagesEditorStrings";

/** The calls that read the saved versions of a legal page, such as those of `createLegalService`. */
export interface LegalPageRevisionCalls<K extends string, L extends string> {
  listRevisions?: ((key: K, locale: L) => Promise<LegalPageRevisionSummary[]>) | undefined;
  getRevision?: ((key: K, locale: L, id: number) => Promise<LegalPageRevision>) | undefined;
}

interface LegalPageRevisionsProps<K extends string, L extends string> {
  service: LegalPageRevisionCalls<K, L>;
  pageKey: K;
  locale: L;
  /** Goes up after each save, so the list loads again. */
  version: number;
  dateLocale: string | undefined;
  text: LegalPagesEditorStrings;
}

/**
 * The saved versions of one page in one locale, newest first, with the date and time of each. A
 * version opens read-only below the list with its Markdown rendered. The editor gives it a new `key`
 * per page and locale, so an opened version closes when the admin switches.
 */
export function LegalPageRevisions<K extends string, L extends string>({ service, pageKey, locale, version, dateLocale, text }: LegalPageRevisionsProps<K, L>) {
  // The list with the save count it was loaded for, so a newer save shows the loading text. Null list means the load failed.
  const [loaded, setLoaded] = useState<{ version: number; list: LegalPageRevisionSummary[] | null } | null>(null);
  const [opened, setOpened] = useState<LegalPageRevision | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  const serviceRef = useRef(service);
  useEffect(() => {
    serviceRef.current = service;
  }, [service]);

  useEffect(() => {
    const listRevisions = serviceRef.current.listRevisions;
    if (!listRevisions) return;
    let current = true;
    listRevisions(pageKey, locale)
      .then(list => current && setLoaded({ version, list }))
      .catch(() => current && setLoaded({ version, list: null }));
    return () => {
      current = false;
    };
  }, [pageKey, locale, version]);

  const formatted = (value: string) => {
    const date = parseTimestamp(value);
    return date ? new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium", timeStyle: "medium" }).format(date) : value;
  };

  const open = async (id: number) => {
    const getRevision = serviceRef.current.getRevision;
    if (!getRevision) return;
    setOpening(id);
    try {
      setOpened(await getRevision(pageKey, locale, id));
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : text.revisionFailed);
    } finally {
      setOpening(null);
    }
  };

  // Without the calls there is nothing to list, and the section says so instead of going away.
  const list = service.listRevisions ? (loaded?.version === version ? loaded.list : undefined) : [];
  const canOpen = service.getRevision !== undefined;

  return (
    <section aria-labelledby="legal-revisions-heading" className="space-y-3 border-t border-gray-200 pt-4">
      <h3 id="legal-revisions-heading" className="text-sm font-semibold text-gray-900">
        {text.revisionsHeading}
      </h3>

      {list === undefined ? (
        <p className="text-sm text-gray-500">{text.loading}</p>
      ) : list === null ? (
        <p className="text-sm text-gray-500">{text.revisionsFailed}</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-gray-500">{text.noRevisions}</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {list.map((revision, index) => (
            <li key={revision.id}>
              <button
                type="button"
                onClick={() => open(revision.id)}
                disabled={!canOpen || opening !== null}
                aria-pressed={opened?.id === revision.id}
                className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left text-sm transition-colors disabled:opacity-60 ${
                  opened?.id === revision.id ? "bg-gray-100" : "hover:bg-gray-50"
                }`}
              >
                <span className="font-medium text-gray-900 tabular-nums">{formatted(revision.savedAt)}</span>
                <span className="min-w-0 flex-1 truncate text-gray-500">{revision.title}</span>
                {index === 0 && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{text.currentRevision}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {opened && (
        <article aria-labelledby="legal-revision-title" className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-gray-500">
                {text.revisionSaved}: {formatted(opened.savedAt)}
              </p>
              <h4 id="legal-revision-title" className="font-bold text-gray-900 break-words">
                {opened.title}
              </h4>
            </div>
            <button type="button" onClick={() => setOpened(null)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100">
              {text.closeRevision}
            </button>
          </div>
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            <Markdown>{opened.bodyMarkdown}</Markdown>
          </div>
        </article>
      )}
    </section>
  );
}
