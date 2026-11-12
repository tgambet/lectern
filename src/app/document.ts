/** Loads what the reading column shows for a path. No DOM: testable with MemoryFS. */
import { isFsError } from "../fs/errors.ts";
import type { VirtualFS } from "../fs/virtual-fs.ts";
import { hasScripts } from "../html/rewrite.ts";
import type { LinkContext, RenderedMarkdown } from "../markdown/pipeline.ts";
import { documentKind } from "../tree/documents.ts";
import { lookup, type FileIndex } from "../tree/file-index.ts";
import { readUrl } from "./routes.ts";

/** Larger files are not displayed (they would freeze the page and rarely are prose). */
export const MAX_DISPLAY_BYTES = 2 * 1024 * 1024;

export type DocumentView =
  | { kind: "markdown"; path: string; rendered: RenderedMarkdown }
  | { kind: "html"; path: string; hasScripts: boolean }
  | { kind: "other"; path: string }
  | { kind: "missing"; path: string }
  /** A folder without README or index (`path` is the folder, `""` for the root). */
  | { kind: "no-landing"; path: string }
  | { kind: "too-large"; path: string; size: number }
  | { kind: "error"; path: string; message: string };

export interface DocumentSource {
  fs: VirtualFS;
  index: FileIndex;
  folderId: string;
}

let controlled: Promise<void> | null = null;

/**
 * Resolves once the service worker controls the page (at most 3 s), so the
 * first document's images and files resolve through `/~/`.
 */
export function whenControlled(): Promise<void> {
  controlled ??= new Promise((resolve) => {
    const sw = typeof navigator === "undefined" ? undefined : navigator.serviceWorker;
    if (!sw || sw.controller) return resolve();
    sw.addEventListener("controllerchange", () => resolve(), { once: true });
    setTimeout(resolve, 3000);
  });
  return controlled;
}

export async function loadDocument(source: DocumentSource, path: string): Promise<DocumentView> {
  if (lookup(source.index, path) !== "file") return { kind: "missing", path };
  const kind = documentKind(path);
  if (kind === null) return { kind: "other", path };
  try {
    const { size } = await source.fs.stat(path);
    if (kind === "html") {
      // The frame loads the document itself; it is read here only to tell whether it has scripts.
      const scripts = size <= MAX_DISPLAY_BYTES && hasScripts(await source.fs.readText(path));
      return { kind: "html", path, hasScripts: scripts };
    }
    if (size > MAX_DISPLAY_BYTES) return { kind: "too-large", path, size };
    const text = await source.fs.readText(path);
    const ctx: LinkContext = {
      docPath: path,
      folderName: source.fs.name,
      rootId: source.folderId,
      lookup: (p) => lookup(source.index, p),
      readUrl,
    };
    // The pipeline and the highlighter are lazy chunks: the shell stays small.
    const { renderMarkdown } = await import("../markdown/pipeline.ts");
    const rendered = await renderMarkdown(text, ctx);
    const { hasCodeBlocks, highlightCodeBlocks } = await import("../highlight/highlight.ts");
    if (hasCodeBlocks(rendered.tree)) await highlightCodeBlocks(rendered.tree);
    return { kind: "markdown", path, rendered };
  } catch (error) {
    if (isFsError(error, "not-found")) return { kind: "missing", path };
    return { kind: "error", path, message: error instanceof Error ? error.message : String(error) };
  }
}

export function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
