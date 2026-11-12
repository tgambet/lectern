import { createHighlighterCore, type HighlighterCore, type ShikiTransformer } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import type { Element, Root } from "hast";
import { toString } from "hast-util-to-string";
import { visit } from "unist-util-visit";
import { grammarFor, grammars, type GrammarId } from "./languages.ts";
import { THEME_NAME, classForColor, lecternTheme } from "./theme.ts";

/**
 * Lines this long render plain. Shiki's default guard is a per-line time limit,
 * but that clock also runs while a grammar's regexes compile on first use (over
 * 2 s for C++), so the first lines lost their colors, depending on machine load.
 * A length cap gives the same output every time and still bounds the worst line
 * (under 0.6 s at this length across the 40 grammars; 34 s at 20,000 characters).
 */
const MAX_TOKENIZED_LINE_LENGTH = 2000;

let highlighter: Promise<HighlighterCore> | null = null;
const loaded = new Set<GrammarId>();

function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= createHighlighterCore({
    themes: [lecternTheme],
    langs: [],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighter;
}

async function ensureGrammar(id: GrammarId): Promise<HighlighterCore> {
  const core = await getHighlighter();
  if (!loaded.has(id)) {
    await core.loadLanguage((await grammars[id]()).default);
    loaded.add(id);
  }
  return core;
}

const toClasses: ShikiTransformer = {
  pre(node) {
    node.properties = { className: ["shiki"] };
  },
  span(node) {
    const style = node.properties.style;
    if (typeof style !== "string") return;
    delete node.properties.style;
    const color = /color:\s*(#[0-9a-f]{6})/i.exec(style)?.[1];
    const className = color ? classForColor(color) : null;
    if (className) node.properties.className = [className];
  },
};

function languageOf(code: Element): string | null {
  const classes = code.properties.className;
  if (!Array.isArray(classes)) return null;
  const match = classes.map(String).find((c) => c.startsWith("language-"));
  return match ? match.slice("language-".length) : null;
}

export function hasCodeBlocks(tree: Root): boolean {
  let found = false;
  visit(tree, "element", (node) => {
    if (node.tagName === "pre") found = true;
  });
  return found;
}

/**
 * Highlights fenced code in a sanitized tree, in place. Every `pre` gets a
 * `data-lang` label (the author's, even when no grammar matches).
 */
export async function highlightCodeBlocks(tree: Root): Promise<void> {
  const jobs: Array<{ pre: Element; code: Element; label: string | null }> = [];
  visit(tree, "element", (pre) => {
    if (pre.tagName !== "pre") return;
    const code = pre.children.find(
      (c): c is Element => c.type === "element" && c.tagName === "code",
    );
    if (code) jobs.push({ pre, code, label: languageOf(code) });
  });
  for (const { pre, code, label } of jobs) {
    pre.properties.dataLang = label ?? "text";
    const id = label ? grammarFor(label) : null;
    if (!id) continue;
    const core = await ensureGrammar(id);
    const result = core.codeToHast(toString(code).replace(/\n$/, ""), {
      lang: id,
      theme: THEME_NAME,
      tokenizeTimeLimit: 0,
      tokenizeMaxLineLength: MAX_TOKENIZED_LINE_LENGTH,
      transformers: [toClasses],
    });
    const highlighted = result.children[0];
    if (highlighted?.type !== "element") continue;
    pre.children = highlighted.children;
  }
}
