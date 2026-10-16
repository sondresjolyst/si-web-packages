// Plain values, with no "use client", so a server component can import them.

/** The chart's text. Pass the app's own language. The defaults are English. */
export interface StatHistoryChartStrings {
  /** The text shown instead of the chart when there are no days yet. */
  empty: string;
  /** The chart's accessible name. */
  chart: string;
}

export const defaultStatHistoryChartStrings: StatHistoryChartStrings = {
  empty: "No history yet. Check back tomorrow.",
  chart: "Stats over time",
};

/** The default line colors, in order: blue, green, amber, teal, and purple. */
export const STAT_SERIES_COLORS = ["#2563eb", "#16a34a", "#d97706", "#0d9488", "#9333ea"] as const;
