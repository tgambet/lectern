import type { Root } from "hast";
import { toString } from "hast-util-to-string";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";

export interface TocEntry {
  depth: 2 | 3;
  id: string;
  text: string;
}

export interface OutlineData {
  toc: TocEntry[];
  /** Text of the first `h1`, if any. */
  heading: string | null;
}

/** Collects the first h1 and the h2/h3 outline into `file.data`. Runs after rehype-slug. */
export function rehypeOutline() {
  return (tree: Root, file: VFile) => {
    const data: OutlineData = { toc: [], heading: null };
    visit(tree, "element", (node) => {
      if (node.tagName === "h1" && data.heading === null) data.heading = toString(node).trim();
      if (node.tagName !== "h2" && node.tagName !== "h3") return;
      const id = node.properties.id;
      if (typeof id !== "string") return;
      data.toc.push({ depth: node.tagName === "h2" ? 2 : 3, id, text: toString(node).trim() });
    });
    Object.assign(file.data, data);
  };
}
