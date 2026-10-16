import { normalizePath } from "../seo/site";
import { requestRevalidate } from "./requestRevalidate";

/** The pages one admin edit changes. */
export interface RevalidateTargetPaths {
  /** The paths below each locale segment, such as `/builds/[slug]`. `""` is the locale's front page. */
  pages?: readonly string[] | undefined;
  /** The paths outside the locale segments, such as `/sitemap.xml`. */
  root?: readonly string[] | undefined;
}

/** Options for `defineRevalidateTargets`. */
export interface RevalidateTargetsConfig<T extends string> {
  /** The locale segments every page is under. A site without them omits this. */
  locales?: readonly string[] | undefined;
  targets: Record<T, RevalidateTargetPaths>;
}

/**
 * Defines the cache targets an app's admin edits purge, in one place for the client and the server.
 * `targets` names them for fetch tags, `paths` lists what `createRevalidateRoute` purges for each,
 * and `revalidate` asks the route to purge one after an edit. A target with no paths is purged by
 * its tag alone.
 */
export function defineRevalidateTargets<T extends string>({ locales = [], targets }: RevalidateTargetsConfig<T>) {
  const names = Object.keys(targets) as T[];

  return {
    targets: Object.fromEntries(names.map(name => [name, name])) as { readonly [K in T]: K },
    paths: Object.fromEntries(
      names.map(name => {
        const { pages = [], root = [] } = targets[name];
        const localized =
          locales.length > 0
            ? locales.flatMap(locale => pages.map(page => `/${locale}${normalizePath(page)}`))
            : pages.map(page => normalizePath(page) || "/");
        return [name, [...localized, ...root]];
      }),
    ) as Record<T, string[]>,
    revalidate: (target: T): Promise<void> => requestRevalidate(target),
  };
}
