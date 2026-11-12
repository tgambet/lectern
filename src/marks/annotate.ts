import type { Element, ElementContent, Root, Text } from "hast";
import { locate, stripSpaces, type TextQuote } from "./anchor.ts";

export interface NoteAnchor {
  id: string;
  quote: TextQuote;
}

export interface Annotated {
  tree: Root;
  /** Ids of the notes found, in document order; a note's number is its position + 1. */
  placed: string[];
  /** Ids of the notes whose text is no longer in the document. */
  missing: string[];
}

type Parent = { children: ElementContent[] };

interface Run {
  node: Text;
  parent: Parent;
  /** The link holding this text: a note's button cannot go inside it. */
  link: { element: Element; parent: Parent } | null;
  /** Position of the run in the whitespace-free text. */
  start: number;
  /** For each non-space character of the node, its index in `node.value`. */
  offsets: number[];
}

/** Code blocks render through their own component, so notes do not reach into them. */
const SKIPPED = new Set(["pre", "lc-icon"]);

function collect(parent: Parent, link: Run["link"], runs: Run[], cursor: { at: number }): void {
  for (const child of parent.children) {
    if (child.type === "text") {
      const offsets: number[] = [];
      for (let i = 0; i < child.value.length; i++) {
        if (stripSpaces(child.value[i]!) !== "") offsets.push(i);
      }
      if (offsets.length > 0) runs.push({ node: child, parent, link, start: cursor.at, offsets });
      cursor.at += offsets.length;
    } else if (child.type === "element" && !SKIPPED.has(child.tagName)) {
      const inner = link ?? (child.tagName === "a" ? { element: child, parent } : null);
      collect(child, inner, runs, cursor);
    }
  }
}

interface Placement {
  id: string;
  number: number;
  start: number;
  end: number;
}

const noteRef = (note: Placement): Element => ({
  type: "element",
  tagName: "lc-note-ref",
  properties: { dataNote: note.id, dataNumber: note.number },
  children: [],
});

function annotateRun(run: Run, notes: Placement[]): void {
  const runEnd = run.start + run.offsets.length;
  const inside = notes.filter((n) => n.start < runEnd && n.end > run.start);
  if (inside.length === 0) return;

  const edges = new Set([run.start, runEnd]);
  for (const n of inside) {
    if (n.start > run.start) edges.add(n.start);
    if (n.end < runEnd) edges.add(n.end);
  }
  const sorted = [...edges].sort((a, b) => a - b);

  const { value } = run.node;
  const pieces: ElementContent[] = [];
  const afterLink: Element[] = [];
  let cursor = 0;
  for (let i = 0; i + 1 < sorted.length; i++) {
    const from = sorted[i]!;
    const to = sorted[i + 1]!;
    const covering = inside.filter((n) => n.start <= from && n.end >= to);
    if (covering.length === 0) continue;
    const textFrom = run.offsets[from - run.start]!;
    const textTo = run.offsets[to - 1 - run.start]! + 1;
    if (textFrom > cursor) pieces.push({ type: "text", value: value.slice(cursor, textFrom) });
    pieces.push({
      type: "element",
      tagName: "mark",
      properties: { className: ["lc-note"] },
      children: [{ type: "text", value: value.slice(textFrom, textTo) }],
    });
    cursor = textTo;
    const refs = covering.filter((n) => n.end === to).map(noteRef);
    if (run.link) afterLink.push(...refs);
    else pieces.push(...refs);
  }
  if (cursor < value.length) pieces.push({ type: "text", value: value.slice(cursor) });

  run.parent.children.splice(run.parent.children.indexOf(run.node), 1, ...pieces);
  if (run.link && afterLink.length > 0) {
    const { element, parent } = run.link;
    parent.children.splice(parent.children.indexOf(element) + 1, 0, ...afterLink);
  }
}

/**
 * Marks each note's text in a copy of the sanitized tree: `<mark>` around the
 * text, then an `lc-note-ref` element the Article renders as a numbered button.
 * Real elements on purpose, so assistive technology and the keyboard reach them
 * (ADR 0014). Runs on trusted output: a document cannot produce `lc-note-ref`,
 * which the sanitizer drops, and only ids and numbers enter the tree.
 */
export function annotateTree(tree: Root, notes: NoteAnchor[]): Annotated {
  if (notes.length === 0) return { tree, placed: [], missing: [] };
  const copy = structuredClone(tree);
  const runs: Run[] = [];
  collect(copy as unknown as Parent, null, runs, { at: 0 });
  const text = runs
    .map((run) => run.offsets.map((offset) => run.node.value[offset]!).join(""))
    .join("");

  const found: Omit<Placement, "number">[] = [];
  const missing: string[] = [];
  for (const note of notes) {
    const range = locate(text, note.quote);
    if (range) found.push({ id: note.id, ...range });
    else missing.push(note.id);
  }
  found.sort((a, b) => a.start - b.start || a.end - b.end);
  const placements = found.map((note, index) => ({ ...note, number: index + 1 }));

  for (const run of runs) annotateRun(run, placements);
  return { tree: copy, placed: placements.map((n) => n.id), missing };
}
