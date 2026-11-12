import { isFsError } from "../fs/errors.ts";
import type { VirtualFS } from "../fs/virtual-fs.ts";
import type { IgnoreRule } from "./ignore.ts";

/** Every file and folder Lectern considers, after ignore rules. Paths are root-relative. */
export interface FileIndex {
  files: Set<string>;
  dirs: Set<string>;
}

export interface IndexOptions {
  ignore: IgnoreRule;
  /** Called after each folder is listed, with the running file count. */
  onProgress?: (files: number) => void;
  signal?: AbortSignal;
}

/** Walks the folder breadth-first. Unreadable sub-folders are skipped, not fatal. */
export async function buildFileIndex(fs: VirtualFS, options: IndexOptions): Promise<FileIndex> {
  const index: FileIndex = { files: new Set(), dirs: new Set([""]) };
  const queue = [""];
  while (queue.length > 0) {
    options.signal?.throwIfAborted();
    const dir = queue.shift()!;
    let entries;
    try {
      entries = await fs.list(dir);
    } catch (error) {
      if (dir !== "" && isFsError(error)) continue;
      throw error;
    }
    for (const entry of entries) {
      if (options.ignore(entry.path, entry.kind)) continue;
      if (entry.kind === "directory") {
        index.dirs.add(entry.path);
        queue.push(entry.path);
      } else {
        index.files.add(entry.path);
      }
    }
    options.onProgress?.(index.files.size);
  }
  return index;
}

export function lookup(index: FileIndex, path: string): "file" | "directory" | null {
  if (index.files.has(path)) return "file";
  if (index.dirs.has(path)) return "directory";
  return null;
}
