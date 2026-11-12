import { basename, dirname, extname } from "../fs/path.ts";
import type { FileIndex } from "./file-index.ts";

export type DocumentKind = "markdown" | "html";

const kinds: Record<string, DocumentKind> = {
  ".md": "markdown",
  ".markdown": "markdown",
  ".mdown": "markdown",
  ".html": "html",
  ".htm": "html",
};

export function documentKind(path: string): DocumentKind | null {
  return kinds[extname(path)] ?? null;
}

const landingNames = ["readme.md", "readme.markdown", "index.md", "index.html", "index.htm"];

/** The document shown for a folder: its README, else its index. */
export function landingFor(index: FileIndex, dir: string): string | null {
  const byName = new Map<string, string>();
  for (const file of index.files) {
    if (dirname(file) === dir) byName.set(basename(file).toLowerCase(), file);
  }
  for (const name of landingNames) {
    const file = byName.get(name);
    if (file) return file;
  }
  return null;
}

export function countDocuments(index: FileIndex): number {
  let count = 0;
  for (const file of index.files) if (documentKind(file)) count++;
  return count;
}
