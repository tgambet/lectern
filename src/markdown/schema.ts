/**
 * What survives sanitization. Starts from GitHub's schema (hast-util-sanitize
 * default: no scripts, styles, event handlers or `javascript:` URLs) and adds
 * only what we want to render. Raw HTML in Markdown passes through this too.
 */
import { defaultSchema, type Options as Schema } from "rehype-sanitize";

const base = defaultSchema;

/**
 * Design-system classes an author may use in raw HTML inside Markdown. An
 * explicit list, not an `lc-*` pattern: the app's own classes (`lc-btn`,
 * `lc-broken`, `lc-sr-only`...) must not be forgeable by a document. Keep in
 * sync with `design/components/Prose/README.md`.
 */
export const documentClasses = [
  "lc-lede",
  "lc-notice",
  "lc-notice--info",
  "lc-notice--warn",
  "lc-notice--danger",
  "lc-notice__head",
] as const;

export const sanitizeSchema: Schema = {
  ...base,
  tagNames: [...(base.tagNames ?? []), "mark", "figure", "figcaption", "abbr"],
  attributes: {
    ...base.attributes,
    "*": [...(base.attributes?.["*"] ?? []), ["className", ...documentClasses]],
    abbr: ["title"],
    img: [...(base.attributes?.img ?? []), "width", "height", "loading"],
    // Fenced code language, used to pick a grammar.
    code: [["className", /^language-[\w+#.-]+$/]],
  },
  // Only these schemes may appear in links and images; everything else is dropped.
  protocols: {
    ...base.protocols,
    href: ["http", "https", "mailto"],
    src: ["http", "https"],
  },
};
