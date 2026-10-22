"use client";

import { useEffect, useRef, useState } from "react";
import type { EmailStats } from "../api/services";
import { fillTemplate } from "../ui/fillTemplate";
import { withDefaults, type TextOverrides } from "../ui/withDefaults";
import { defaultEmailStatsPanelStrings, type EmailStatsPanelStrings } from "./emailStatsPanelStrings";

/** Props for `EmailStatsPanel`. */
export interface EmailStatsPanelProps {
  /** The email stats call, such as `createEmailStatsService(api)`. */
  service: { get: (days?: number) => Promise<EmailStats> };
  /**
   * How many days back the stats go. Defaults to 30. With `onDaysChange` the panel shows these days
   * and leaves the choice to the app. Without it, this is where the picker starts.
   */
  days?: number | undefined;
  /** The days an admin can pick between, such as `[7, 30, 90]`. Without it, the panel has no picker. */
  periods?: readonly number[] | undefined;
  /** Called with the days an admin picks. Give it to control `days` from the app. */
  onDaysChange?: ((days: number) => void) | undefined;
  /** Shows hard and soft bounces, blocked, spam reports, and invalid addresses on their own rows. */
  separateCounts?: boolean | undefined;
  strings?: TextOverrides<EmailStatsPanelStrings> | undefined;
  /** The classes that replace the card's border and spacing, such as when the panel sits in the app's own card. */
  className?: string | undefined;
}

type State = { days: number } & ({ status: "failed" } | { status: "loaded"; stats: EmailStats });

/**
 * The admin card for the transactional email of the last days, from SjolystInnovation.AppKit.Email's
 * stats endpoint: sent, delivered, bounces, and blocked or reported as spam, or each count on its own.
 * It says the stats are unavailable when they cannot load, without a toast, so the rest of the stats
 * page stays calm.
 */
export function EmailStatsPanel({
  service,
  days = 30,
  periods,
  onDaysChange,
  separateCounts = false,
  strings,
  className = "rounded-2xl border border-admin-border p-5",
}: EmailStatsPanelProps) {
  const text = withDefaults(defaultEmailStatsPanelStrings, strings);
  // The days picked in the panel itself, until the app gives other days. A panel with
  // `onDaysChange` never picks on its own.
  const [picked, setPicked] = useState<{ from: number; days: number } | null>(null);
  const selected = picked?.from === days ? picked.days : days;
  const hasPicker = periods !== undefined && periods.length > 0;
  const [state, setState] = useState<State | null>(null);
  // The latest service, so an inline one does not load the stats again on every render.
  const serviceRef = useRef(service);
  useEffect(() => {
    serviceRef.current = service;
  }, [service]);

  // An answer for earlier days is ignored, so a slow one cannot replace the newer stats.
  useEffect(() => {
    let replaced = false;
    serviceRef.current
      .get(selected)
      .then((stats) => {
        if (!replaced) setState({ days: selected, status: "loaded", stats });
      })
      .catch(() => {
        if (!replaced) setState({ days: selected, status: "failed" });
      });
    return () => {
      replaced = true;
    };
  }, [selected]);

  // Stats for other days than the selected ones count as loading.
  const current = state?.days === selected ? state : null;
  const shownDays = current?.status === "loaded" ? current.stats.days : selected;
  const rows = (stats: EmailStats) =>
    separateCounts
      ? [
          { label: text.sent, value: stats.requests },
          { label: text.delivered, value: stats.delivered },
          { label: text.hardBounces, value: stats.hardBounces },
          { label: text.softBounces, value: stats.softBounces },
          { label: text.blockedOnly, value: stats.blocked },
          { label: text.spamReports, value: stats.spamReports },
          { label: text.invalid, value: stats.invalid },
        ]
      : [
          { label: text.sent, value: stats.requests },
          { label: text.delivered, value: stats.delivered },
          { label: text.bounces, value: stats.hardBounces + stats.softBounces },
          { label: text.blocked, value: stats.blocked + stats.spamReports },
        ];

  const pick = (next: number) => {
    if (onDaysChange) onDaysChange(next);
    else setPicked({ from: days, days: next });
  };

  const title = <h2 className={`font-bold text-admin-title${hasPicker ? "" : " mb-3"}`}>{fillTemplate(text.title, { days: shownDays })}</h2>;

  return (
    <section className={className}>
      {hasPicker ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title}
          <div role="group" aria-label={text.period} className="flex gap-1">
            {periods.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => pick(option)}
                aria-pressed={option === selected}
                className={`rounded-button px-2.5 py-1 text-xs transition-colors ${
                  option === selected ? "bg-button-primary-bg text-button-primary-text" : "text-admin-tab hover:text-admin-tab-hover"
                }`}
              >
                {fillTemplate(text.periodOption, { days: option })}
              </button>
            ))}
          </div>
        </div>
      ) : (
        title
      )}
      {current?.status === "loaded" ? (
        <dl className="space-y-1.5 text-sm">
          {rows(current.stats).map((row) => (
            <div key={row.label} className="flex justify-between">
              <dt className="text-admin-stat-label">{row.label}</dt>
              <dd className="tabular-nums text-admin-stat-value">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-admin-stat-label">{current?.status === "failed" ? text.unavailable : text.loading}</p>
      )}
    </section>
  );
}
