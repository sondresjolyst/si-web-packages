import Link from "next/link";
import { cx } from "./cx";
import { defaultNotFoundStateStrings, type NotFoundStateStrings } from "./notFoundStateStrings";
import { withDefaults, type TextOverrides } from "./withDefaults";

/** Props for `NotFoundState`. */
export interface NotFoundStateProps {
  /** The home link's target, such as `/` or `/en`. */
  homeHref: string;
  strings?: TextOverrides<NotFoundStateStrings> | undefined;
  /** The classes for placing the component, on its outer element. */
  className?: string | undefined;
}

/** Renders the content of a `not-found.tsx`. The message is the page's heading. */
export function NotFoundState({ homeHref, strings, className }: NotFoundStateProps) {
  const text = withDefaults(defaultNotFoundStateStrings, strings);
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
