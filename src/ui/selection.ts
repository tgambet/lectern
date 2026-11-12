/** What a new note quotes: the reader's selection, or else the section being read. */
import { quoteFrom, type TextQuote } from "../marks/anchor.ts";

/** In the page but not in the Markdown tree, or not annotatable (ADR 0014). */
const LEFT_OUT = ".lc-code, .lc-note-ref";

function textOf(range: Range): string {
  const copy = range.cloneContents();
  for (const element of copy.querySelectorAll(LEFT_OUT)) element.remove();
  return copy.textContent ?? "";
}

function quoteOfRange(root: Element, range: Range): TextQuote | null {
  const before = document.createRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  const after = document.createRange();
  after.selectNodeContents(root);
  after.setStart(range.endContainer, range.endOffset);
  return quoteFrom(textOf(before), textOf(range), textOf(after));
}

export function quoteOfSelection(root: Element): TextQuote | null {
  const selection = getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  return root.contains(range.commonAncestorContainer) ? quoteOfRange(root, range) : null;
}

/** The heading of the section in view, as the table of contents reckons it; else the first block. */
export function quoteOfSection(root: Element): TextQuote | null {
  const line = innerHeight / 3;
  let target: Element | null = null;
  for (const heading of root.querySelectorAll("h1, h2, h3")) {
    if (target === null || heading.getBoundingClientRect().top <= line) target = heading;
  }
  target ??= root.querySelector("p, li");
  if (!target) return null;
  const range = document.createRange();
  range.selectNodeContents(target);
  return quoteOfRange(root, range);
}
