import { serializeGraph, type SchemaNode } from "./schema";

/** One JSON-LD block. Search engines merge every block on a page into one graph. */
export function JsonLd({ nodes }: { nodes: SchemaNode[] }) {
  if (nodes.length === 0) return null;

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeGraph(nodes) }} />;
}
