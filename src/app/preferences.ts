import { effect, signal, type Signal } from "@preact/signals";
import { parseTreeView } from "../tree/tree.ts";

/** Per-device reading preferences, in localStorage like the theme. */

export const SIDEBAR_MIN = 220;
export const SIDEBAR_MAX = 560;

export function clampSidebar(width: number): number {
  return Math.round(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, width)));
}

/** A stored width, or null for the design default (`--sidebar`). */
export function parseSidebarWidth(value: string | null): number | null {
  const width = Number(value);
  return value && Number.isFinite(width) ? clampSidebar(width) : null;
}

function stored<T>(key: string, parse: (value: string | null) => T): Signal<T> {
  let initial: string | null = null;
  try {
    initial = localStorage.getItem(key);
  } catch {
    // Storage blocked: defaults for this session.
  }
  const value = signal(parse(initial));
  effect(() => {
    try {
      if (value.value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, String(value.value));
    } catch {
      // Storage blocked: the choice lasts for this session only.
    }
  });
  return value;
}

/** File tree width in pixels; null follows the design token. */
export const sidebarWidth = stored("lectern.sidebar", parseSidebarWidth);

export type ReadingWidth = "normal" | "wide" | "full";

export function parseReadingWidth(value: string | null): ReadingWidth {
  return value === "wide" || value === "full" ? value : "normal";
}

/** Width of the reading column: `measure`, `measure-wide`, or all the space. */
export const readingWidth = stored("lectern.reading-width", parseReadingWidth);

/** Zen mode shows the document alone. Not kept: a new visit starts with the tree. */
export const zen = signal(false);

/** Nested, compact or flat file tree. */
export const treeView = stored("lectern.tree-view", parseTreeView);
