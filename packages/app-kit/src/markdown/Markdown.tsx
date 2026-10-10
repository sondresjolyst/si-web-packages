import type { ComponentPropsWithoutRef, ElementType } from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

type Tag = keyof React.JSX.IntrinsicElements;

/** The props without the `node` react-markdown passes, which is no DOM attribute. */
function domProps<P extends ExtraProps>(props: P): Omit<P, "node"> {
  const rest = { ...props };
  delete rest.node;
  return rest;
}

/** An app's element, given the props without `node`, so it can spread them onto a DOM element. */
function withoutNode(Element: ElementType) {
  const Wrapped = (props: ExtraProps) => <Element {...domProps(props)} />;
  return Wrapped;
}

/** An element with fixed classes. */
function styled<T extends Tag>(Element: T, className: string) {
  const Styled = (props: ComponentPropsWithoutRef<T> & ExtraProps) => {
    const Component = Element as ElementType;
    return <Component className={className} {...domProps(props)} />;
  };
  return Styled;
}

/** The default look. A heading level one becomes a level two, since the page has its own `h1`. */
export const markdownComponents: Components = {
  h1: styled("h2", "text-lg font-semibold text-markdown-heading"),
  h2: styled("h2", "text-base font-semibold text-markdown-heading pt-2"),
  h3: styled("h3", "text-sm font-semibold text-markdown-heading"),
  p: styled("p", "leading-relaxed"),
  ul: styled("ul", "list-disc list-outside pl-5 space-y-1"),
  ol: styled("ol", "list-decimal list-outside pl-5 space-y-1"),
  li: styled("li", "leading-relaxed"),
  a: styled("a", "font-medium text-markdown-link underline hover:text-markdown-link-hover"),
  strong: styled("strong", "font-semibold text-markdown-strong"),
  hr: styled("hr", "border-markdown-border"),
  blockquote: styled("blockquote", "border-l-2 border-markdown-border pl-4 italic"),
  code: styled("code", "rounded bg-markdown-code-bg px-1 py-0.5 text-xs font-mono text-markdown-code-text"),
  table: props => (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse" {...domProps(props)} />
    </div>
  ),
  thead: styled("thead", "border-b border-markdown-border"),
  tbody: styled("tbody", "divide-y divide-markdown-border"),
  th: styled("th", "text-left py-2 pr-4 font-semibold text-markdown-heading"),
  td: styled("td", "py-2 pr-4 align-top"),
};

const isExternal = (href: string | undefined) => href != null && /^https?:\/\//i.test(href);

export interface MarkdownProps {
  /** Markdown text. Empty, null or undefined renders nothing. */
  children: string | null | undefined;
  /** Replaces the default element for a tag, such as `{ p: MyParagraph }`. It gets the props without `node`. */
  components?: Components | undefined;
  /** Opens links to other sites in a new tab, without passing the opener or referrer. */
  externalLinks?: boolean | undefined;
  /** Wraps the output in a `div` with these classes. Without it the elements render bare, so a parent's `space-y-*` spaces them. */
  className?: string | undefined;
}

/**
 * Markdown from an editor or the API, with GitHub tables, lists and links. Raw HTML is never
 * rendered, and the output is sanitized, so the text cannot inject scripts, styles or event handlers.
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
