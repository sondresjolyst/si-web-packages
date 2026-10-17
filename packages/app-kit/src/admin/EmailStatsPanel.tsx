"use client";

import { useEffect, useRef, useState } from "react";
import type { EmailStats } from "../api/services";
import { withDefaults, type TextOverrides } from "../ui/withDefaults";
import { defaultEmailStatsPanelStrings, type EmailStatsPanelStrings } from "./emailStatsPanelStrings";

/** Props for `EmailStatsPanel`. */
export interface EmailStatsPanelProps {
  /** The email stats call, such as `createEmailStatsService(api)`. */
  service: { get: (days?: number) => Promise<EmailStats> };
  /** How many days back the stats go. Defaults to 30. */
  days?: number | undefined;
  strings?: TextOverrides<EmailStatsPanelStrings> | undefined;
  /** The classes that replace the card's border and spacing, such as when the panel sits in the app's own card. */
  className?: string | undefined;
}

type State = { status: "loading" } | { status: "failed" } | { status: "loaded"; stats: EmailStats };

/**
 * The admin card for the transactional email of the last days, from SjolystInnovation.AppKit.Email's
 * stats endpoint: sent, delivered, bounces, and blocked or reported as spam. It says the stats are
 * unavailable when they cannot load, without a toast, so the rest of the stats page stays calm.
 */
export function EmailStatsPanel({ service, days = 30, strings, className = "rounded-2xl border border-admin-border p-5" }: EmailStatsPanelProps) {
  const text = withDefaults(defaultEmailStatsPanelStrings, strings);
  const [state, setState] = useState<State>({ status: "loading" });
  // The latest service, so an inline one does not load the stats again on every render.
  const serviceRef = useRef(service);
  useEffect(() => {
    serviceRef.current = service;
  }, [service]);

  // An answer for an earlier `days` is ignored, so a slow one cannot replace the newer stats.
  useEffect(() => {
    let replaced = false;
    serviceRef.current
      .get(days)
      .then((stats) => {
        if (!replaced) setState({ status: "loaded", stats });
      })
      .catch(() => {
        if (!replaced) setState({ status: "failed" });
      });
    return () => {
      replaced = true;
    };
  }, [days]);

  const shownDays = state.status === "loaded" ? state.stats.days : days;
  const rows = (stats: EmailStats) => [
    { label: text.sent, value: stats.requests },
    { label: text.delivered, value: stats.delivered },
    { label: text.bounces, value: stats.hardBounces + stats.softBounces },
    { label: text.blocked, value: stats.blocked + stats.spamReports },
  ];

  return (
    <section className={className}>
      <h2 className="font-bold text-admin-title mb-3">{text.title.replaceAll("{days}", String(shownDays))}</h2>
      {state.status === "loaded" ? (
        <dl className="space-y-1.5 text-sm">
          {rows(state.stats).map((row) => (
            <div key={row.label} className="flex justify-between">
              <dt className="text-admin-stat-label">{row.label}</dt>
              <dd className="tabular-nums text-admin-stat-value">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-admin-stat-label">{state.status === "failed" ? text.unavailable : text.loading}</p>
      )}
    </section>
  );
}
