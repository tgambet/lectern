import type { Element, ElementContent, Root } from "hast";
import { visit } from "unist-util-visit";

type Kind = "info" | "warn" | "danger";

const alerts: Record<string, [Kind, "info" | "alert", string]> = {
  note: ["info", "info", "Note"],
  tip: ["info", "info", "Tip"],
  important: ["info", "info", "Important"],
  warning: ["warn", "alert", "Warning"],
  caution: ["danger", "alert", "Caution"],
};

const MARKER = /^\s*\[!(note|tip|important|warning|caution)\][ \t]*(?:\r?\n|$)/i;

const isBlank = (node: ElementContent) => node.type === "text" && node.value.trim() === "";

/**
 * GitHub alerts: a blockquote opening with `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`,
 * `[!WARNING]` or `[!CAUTION]` becomes an `lc-notice` with its label. Runs
 * after sanitization; the icon is an `lc-icon` element the Article maps to
 * the Icon component.
 */
export function rehypeAlerts() {
  return (tree: Root) => {
    visit(tree, "element", (node) => {
      if (node.tagName !== "blockquote") return;
      const first = node.children.find((c): c is Element => c.type === "element");
      const text = first?.tagName === "p" ? first.children[0] : undefined;
      if (!first || text?.type !== "text") return;
      const match = MARKER.exec(text.value);
      const alert = match && alerts[match[1]!.toLowerCase()];
      if (!alert) return;
      const [kind, icon, label] = alert;

      text.value = text.value.slice(match[0].length);
      // The marker alone on its line: drop what is left of its paragraph.
      while (first.children[0] && (isBlank(first.children[0]) || isBreak(first.children[0])))
        first.children.shift();
      if (first.children.length === 0) node.children.splice(node.children.indexOf(first), 1);

      node.tagName = "div";
      node.properties = { className: ["lc-notice", `lc-notice--${kind}`], role: "note" };
      node.children.unshift({
        type: "element",
        tagName: "p",
        properties: { className: ["lc-notice__head"] },
        children: [
          { type: "element", tagName: "lc-icon", properties: { name: icon }, children: [] },
          { type: "text", value: label },
        ],
      });
    });
  };
}

function isBreak(node: ElementContent): boolean {
  return node.type === "element" && node.tagName === "br";
}
