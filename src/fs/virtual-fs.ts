/**
 * The only way the app reads a folder. Implementations: `MemoryFS` (fixtures,
 * tests, demo) and `FileSystemAccessFS` (real handles, milestone 3). Nothing
 * outside those implementations touches a handle. There is no write method,
 * by design.
 *
 * Paths follow `./path.ts`: root-relative, `/`-separated, `""` for the root.
 * Relative-link resolution is the pure `resolvePath` in `./path.ts`, so it
 * behaves the same whatever the backing store.
 */
export type FsKind = "file" | "directory";

export interface FsEntry {
  kind: FsKind;
  name: string;
  path: string;
}

export interface FsStat extends FsEntry {
  /** Bytes; 0 for directories. */
  size: number;
  /** Epoch milliseconds; 0 for directories (the API exposes no directory mtime). */
  lastModified: number;
}

/** A change under the root reported by a watcher; `unknown` means anything may have changed. */
export interface FsChange {
  type: "added" | "removed" | "modified" | "unknown";
  /** Root-relative path; "" for `unknown`. */
  path: string;
}

export interface VirtualFS {
  /** Display name of the root folder, as on disk. */
  readonly name: string;
  /** Direct children of a directory, in no guaranteed order. */
  list(path: string): Promise<FsEntry[]>;
  stat(path: string): Promise<FsStat>;
  readText(path: string): Promise<string>;
  readBlob(path: string): Promise<Blob>;
  /**
   * Reports changes under the root until the returned function is called.
   * Resolves to null when this store or browser cannot watch; callers then
   * re-read the folder on their own schedule.
   */
  watch?(onChange: (changes: FsChange[]) => void): Promise<(() => void) | null>;
}
