"use client";

import Link from "next/link";
import { cx } from "./cx";
import { withDefaults, type TextOverrides } from "./withDefaults";

export interface ErrorStateStrings {
  title: string;
  body: string;
  tryAgain: string;
  home: string;
}

export const defaultErrorStateStrings: ErrorStateStrings = {
  title: "Temporarily unavailable",
  body: "We can't reach the service right now. Please try again shortly.",
  tryAgain: "Try again",
  home: "Go to the front page",
};

export interface ErrorStateProps {
  /** The `reset` Next passes to an `error.tsx`. It renders the page again. */
  reset: () => void;
  /** Where the front page link goes, such as `/` or `/en`. */
  homeHref: string;
  strings?: TextOverrides<ErrorStateStrings> | undefined;
  /** Classes for placing it, on the outer element. */
  className?: string | undefined;
}

/** What an `error.tsx` shows when a page cannot be rendered. The response is still a 500. */
export function ErrorState({ reset, homeHref, strings, className }: ErrorStateProps) {
  const text = withDefaults(defaultErrorStateStrings, strings);
  return (
    <div className={cx("min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center", className)}>
      <h1 className="text-3xl font-black text-state-heading">{text.title}</h1>
      <p className="text-lg text-state-text max-w-md">{text.body}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="rounded-button bg-button-primary-bg text-button-primary-text font-semibold px-6 py-3 hover:brightness-95 transition"
        >
          {text.tryAgain}
        </button>
        <Link href={homeHref} className="font-semibold text-state-link hover:text-state-link-hover underline">
          {text.home}
        </Link>
      </div>
    </div>
  );
}
