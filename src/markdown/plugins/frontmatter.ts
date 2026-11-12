import type { Root } from "mdast";
import type { VFile } from "vfile";
import { parse } from "yaml";

export interface FrontmatterData {
  frontmatter: Record<string, unknown> | null;
}

/** Parses a leading YAML block into `file.data.frontmatter`; invalid YAML is ignored. */
export function remarkFrontmatterData() {
  return (tree: Root, file: VFile) => {
    const first = tree.children[0];
    let data: Record<string, unknown> | null = null;
    if (first?.type === "yaml") {
      try {
        const parsed: unknown = parse(first.value);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          data = parsed as Record<string, unknown>;
        }
      } catch {
        // Malformed frontmatter renders as if absent.
      }
    }
    Object.assign(file.data, { frontmatter: data } satisfies FrontmatterData);
  };
}
