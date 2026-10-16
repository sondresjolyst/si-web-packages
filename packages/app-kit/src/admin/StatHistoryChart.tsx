"use client";

import { useState } from "react";
import { withDefaults, type TextOverrides } from "../ui/withDefaults";

/** One line on the chart. */
export interface StatSeries<T> {
  /** The field of each day's row the line plots. A missing or non-numeric value counts as zero. */
  key: keyof T & string;
  label: string;
  /** The line's colour. Defaults to the next colour in `STAT_SERIES_COLORS`. */
  color?: string | undefined;
}

export interface StatHistoryChartStrings {
  /** Shown instead of the chart when there are no days yet. */
  empty: string;
  /** The chart's accessible name. */
  chart: string;
}

export const defaultStatHistoryChartStrings: StatHistoryChartStrings = {
  empty: "No history yet. Check back tomorrow.",
  chart: "Stats over time",
};

/** The default line colours, in order: blue, green, amber, teal and purple. */
export const STAT_SERIES_COLORS = ["#2563eb", "#16a34a", "#d97706", "#0d9488", "#9333ea"] as const;

export interface StatHistoryChartProps<T extends { date: string }> {
  /** One row per day, oldest first, with `date` as `YYYY-MM-DD`. */
  data: readonly T[];
  series: readonly StatSeries<T>[];
  strings?: TextOverrides<StatHistoryChartStrings> | undefined;
}

const W = 720;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 32 };

/**
 * A line per series over the days, with the scale from zero to the highest shown value. The legend
 * buttons hide and show a line, and the scale follows the lines that are shown.
 */
export function StatHistoryChart<T extends { date: string }>({ data, series, strings }: StatHistoryChartProps<T>) {
  const text = withDefaults(defaultStatHistoryChartStrings, strings);
  const [hidden, setHidden] = useState<string[]>([]);

  const toggle = (key: string) => setHidden(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));

  if (data.length === 0) {
    return <p className="text-sm text-gray-500">{text.empty}</p>;
  }

  const lines = series.map((s, i) => ({ ...s, color: s.color ?? STAT_SERIES_COLORS[i % STAT_SERIES_COLORS.length] }));
  const shown = lines.filter(s => !hidden.includes(s.key));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  // An API without a given series sends no value. It counts as zero rather than poisoning the scale with NaN.
  const value = (d: T, key: keyof T) => Number(d[key]) || 0;
  const maxVal = Math.max(1, ...data.flatMap(d => shown.map(s => value(d, s.key))));
  const n = data.length;

  const x = (i: number) => PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / maxVal) * innerH;

  const path = (key: keyof T) => data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(value(d, key)).toFixed(1)}`).join(" ");

  const ticks = [...new Set([0, Math.round(maxVal / 2), maxVal])];
  const labelIdx = n === 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={text.chart}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={PAD.left} y1={y(t)} x2={W - PAD.right} y2={y(t)} className="stroke-chart-grid" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize={10} className="fill-chart-label">
              {t}
            </text>
          </g>
        ))}
        {labelIdx.map(i => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} className="fill-chart-label">
            {data[i]?.date.slice(5)}
          </text>
        ))}
        {shown.map(s => (
          <path key={s.key} d={path(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-2">
        {lines.map(s => {
          const off = hidden.includes(s.key);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              aria-pressed={!off}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                off ? "border-gray-200 bg-white text-gray-400" : "border-gray-300 bg-gray-50 text-gray-700"
              }`}
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: off ? "#d1d5db" : s.color }} />
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
