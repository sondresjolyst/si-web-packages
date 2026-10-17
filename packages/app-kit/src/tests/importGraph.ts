import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const src = join(__dirname, "..");
const importPattern = /(?:^|\n)\s*(?:import|export)\b[^"']*?\bfrom\s+["']([^"']+)["']|(?:^|\n)\s*import\s+["']([^"']+)["']/g;

function resolve(from: string, spec: string): string {
  const base = join(dirname(from), spec);
  const file = [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")].find(f => existsSync(f));
  if (!file) throw new Error(`Cannot resolve ${spec} from ${from}`);
  return file;
}

/**
 * Gives the packages an entry point's source imports, following its own files. Type imports count,
 * since TypeScript checks the source files an app imports and needs their packages too.
 */
export function packagesImportedBy(entry: string): Set<string> {
  const packages = new Set<string>();
  const seen = new Set<string>();
  const queue = [join(src, entry)];
  for (let file = queue.pop(); file; file = queue.pop()) {
    if (seen.has(file)) continue;
    seen.add(file);
    for (const match of readFileSync(file, "utf8").matchAll(importPattern)) {
      const spec = match[1] ?? match[2]!;
      if (spec.endsWith(".css")) continue;
      if (spec.startsWith(".")) queue.push(resolve(file, spec));
      else packages.add(spec.split("/").slice(0, spec.startsWith("@") ? 2 : 1).join("/"));
    }
  }
  return packages;
}
