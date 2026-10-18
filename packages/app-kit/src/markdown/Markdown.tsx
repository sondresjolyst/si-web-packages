import type { ComponentPropsWithoutRef, ElementType } from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

type Tag = keyof React.JSX.IntrinsicElements;

/** Copies the props without the `node` that react-markdown passes, since `node` is no DOM attribute. */
function domProps<P extends ExtraProps>(props: P): Omit<P, "node"> {
  const rest = { ...props };
  delete rest.node;
  return rest;
}

/** Wraps an app's element so it gets the props without `node` and can spread them onto a DOM element. */
function withoutNode(Element: ElementType) {
  const Wrapped = (props: ExtraProps) => <Element {...domProps(props)} />;
  return Wrapped;
}

/** Creates an element with fixed classes. */
function styled<T extends Tag>(Element: T, className: string) {
  const Styled = (props: ComponentPropsWithoutRef<T> & ExtraProps) => {
    const Component = Element as ElementType;
    return <Component className={className} {...domProps(props)} />;
  };
  return Styled;
}

/** The default elements. Each text element wraps a long word or link, so it cannot run past a narrow container. A level one heading becomes a level two heading, since the page has its own `h1`. */
export const markdownComponents: Components = {
  h1: styled("h2", "text-lg font-semibold text-markdown-heading wrap-anywhere"),
  h2: styled("h2", "text-base font-semibold text-markdown-heading pt-2 wrap-anywhere"),
  h3: styled("h3", "text-sm font-semibold text-markdown-heading wrap-anywhere"),
  p: styled("p", "leading-relaxed wrap-anywhere"),
  ul: styled("ul", "list-disc list-outside pl-5 space-y-1"),
  ol: styled("ol", "list-decimal list-outside pl-5 space-y-1"),
  li: styled("li", "leading-relaxed wrap-anywhere"),
  a: styled("a", "font-medium text-markdown-link underline hover:text-markdown-link-hover wrap-anywhere"),
  strong: styled("strong", "font-semibold text-markdown-strong"),
  hr: styled("hr", "border-markdown-border"),
  blockquote: styled("blockquote", "border-l-2 border-markdown-border pl-4 italic wrap-anywhere"),
  code: styled("code", "rounded bg-markdown-code-bg px-1 py-0.5 text-xs font-mono text-markdown-code-text wrap-anywhere"),
  table: props => (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse" {...domProps(props)} />
    </div>
  ),
  thead: styled("thead", "border-b border-markdown-border"),
  tbody: styled("tbody", "divide-y divide-markdown-border"),
  th: styled("th", "text-left py-2 pr-4 font-semibold text-markdown-heading wrap-anywhere"),
  td: styled("td", "py-2 pr-4 align-top wrap-anywhere"),
};

const isExternal = (href: string | undefined) => href != null && /^https?:\/\//i.test(href);

/** Props for `Markdown`. */
export interface MarkdownProps {
  /** The Markdown text. An empty string, null, or undefined renders nothing. */
  children: string | null | undefined;
  /** The elements that replace the default element for a tag, such as `{ p: MyParagraph }`. Each gets the props without `node`. */
  components?: Components | undefined;
  /** Whether links to other sites open in a new tab, without passing the opener or referrer. Defaults to `false`. */
  externalLinks?: boolean | undefined;
  /** The classes for a `div` around the output. Without it, the elements render bare, so a parent's `space-y-*` spaces them. */
  className?: string | undefined;
}

/**
 * Renders Markdown from an editor or the API, with GitHub tables, lists, and links. Raw HTML is
 * never rendered, and the output is sanitized, so the text cannot inject scripts, styles, or event
 * handlers.
 */
export function Markdown({ children, components, externalLinks = false, className }: MarkdownProps) {
  if (!children) return null;

  const own = Object.entries(components ?? {}).map(([tag, Element]) => [tag, withoutNode(Element as ElementType)]);
  const merged: Components = { ...markdownComponents, ...Object.fromEntries(own) };
  if (externalLinks) {
    const Link = (merged.a ?? "a") as ElementType;
    merged.a = props =>
      isExternal(props.href) ? <Link {...props} target="_blank" rel="noopener noreferrer" /> : <Link {...props} />;
  }

  const output = (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={merged}>
      {children}
    </ReactMarkdown>
  );
  return className === undefined ? output : <div className={className}>{output}</div>;
}
