/**
 * Shiki runs with a TextMate theme whose colours are placeholders; the
 * highlighter then swaps each placeholder for a `tk-*` class from the design
 * system (`design/components/bundle.css`, `--syn-*` tokens). No inline style
 * reaches the page, so the strict CSP holds and both themes come for free.
 */
import type { ThemeRegistration } from "@shikijs/core";

const classes = {
  "#000001": "tk-kw",
  "#000002": "tk-str",
  "#000003": "tk-num",
  "#000004": "tk-cm",
  "#000005": "tk-fn",
  "#000006": "tk-ty",
  "#000007": "tk-p",
} as const;

export function classForColor(color: string): string | null {
  return (classes as Record<string, string>)[color.toUpperCase()] ?? null;
}

const scopes: Array<[keyof typeof classes, string[]]> = [
  ["#000004", ["comment", "punctuation.definition.comment"]],
  [
    "#000002",
    ["string", "string.quoted", "string.template", "constant.other.symbol", "markup.inline.raw"],
  ],
  ["#000003", ["constant.numeric", "constant.character", "constant.other", "constant.language"]],
  [
    "#000001",
    [
      "keyword",
      "storage",
      "storage.type",
      "storage.modifier",
      "variable.language",
      "keyword.operator.new",
      "keyword.control",
    ],
  ],
  [
    "#000006",
    [
      "entity.name.type",
      "entity.name.class",
      "entity.name.tag",
      "support.type",
      "support.class",
      "entity.other.inherited-class",
    ],
  ],
  [
    "#000005",
    [
      "entity.name.function",
      "support.function",
      "entity.other.attribute-name",
      "meta.function-call",
    ],
  ],
  ["#000007", ["punctuation", "meta.brace", "keyword.operator"]],
];

export const THEME_NAME = "lectern";

export const lecternTheme: ThemeRegistration = {
  name: THEME_NAME,
  type: "light",
  fg: "#000000",
  bg: "#FFFFFF",
  settings: scopes.map(([foreground, scope]) => ({ scope, settings: { foreground } })),
};
