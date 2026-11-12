import type { Element, Root } from "hast";
import { SKIP, visit } from "unist-util-visit";

/**
 * Wraps each table in an `lc-table-scroll` box, so a table wider than the
 * column scrolls on its own instead of running under the table of contents.
 * Runs after sanitization.
 */
export function rehypeScrollableTables() {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "table" || index === undefined || !parent) return;
      const wrapper: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["lc-table-scroll"] },
        children: [node],
      };
      parent.children[index] = wrapper;
      return SKIP;
    });
  };
}
