import Link from "next/link";
import { cx } from "./cx";
import { withDefaults, type TextOverrides } from "./withDefaults";

/** The not-found page's text. Pass the app's own language. The defaults are English. */
export interface NotFoundStrings {
  code: string;
  body: string;
  home: string;
}

export const defaultNotFoundStrings: NotFoundStrings = {
  code: "404",
  body: "This page does not exist.",
  home: "Go home",
};

/** Props for `NotFoundState`. */
export interface NotFoundStateProps {
  /** The home link's target, such as `/` or `/en`. */
  homeHref: string;
  strings?: TextOverrides<NotFoundStrings> | undefined;
  /** The classes for placing the component, on its outer element. */
  className?: string | undefined;
}

/** Renders the content of a `not-found.tsx`. The message is the page's heading. */
export function NotFoundState({ homeHref, strings, className }: NotFoundStateProps) {
  const text = withDefaults(defaultNotFoundStrings, strings);
  return (
    <div className={cx("min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center", className)}>
      <span className="text-6xl font-black font-state-code text-state-code">{text.code}</span>
      <h1 className="text-lg text-state-text">{text.body}</h1>
      <Link href={homeHref} className="font-semibold text-state-link hover:text-state-link-hover underline">
        {text.home}
      </Link>
    </div>
  );
}
