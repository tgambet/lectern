import { FsError } from "./errors.ts";
import { basename, dirname, normalizePath, splitPath } from "./path.ts";
import { capabilities } from "../platform/capabilities.ts";
import type { FsChange, FsEntry, FsStat, VirtualFS } from "./virtual-fs.ts";

/** Maps DOMExceptions from the File System Access API to typed errors. */
function toFsError(error: unknown, path: string, mismatch: FsError["code"]): unknown {
  if (!(error instanceof DOMException)) return error;
  switch (error.name) {
    case "NotFoundError":
      return new FsError("not-found", path);
    case "TypeMismatchError":
      return new FsError(mismatch, path);
    case "NotAllowedError":
    case "SecurityError":
      return new FsError("permission", path);
    default:
      return error;
  }
}

declare const storedRoot: unique symbol;

/**
 * A folder handle as kept in IndexedDB. Opaque outside this module: storage
 * persists it, only `FileSystemAccessFS` looks inside.
 */
export type StoredRoot = { readonly [storedRoot]: true };

export type ReadPermission = "granted" | "prompt" | "denied";

/**
 * VirtualFS over a real directory handle. The only module that touches
 * File System Access handles. Read-only: it only ever asks for read access.
 */
export class FileSystemAccessFS implements VirtualFS {
  readonly #root: FileSystemDirectoryHandle;

  private constructor(root: FileSystemDirectoryHandle) {
    this.#root = root;
  }

  /** Wraps a handle from the folder picker. Only `pick-folder.ts` calls this. */
  static fromPicker(handle: FileSystemDirectoryHandle): FileSystemAccessFS {
    return new FileSystemAccessFS(handle);
  }

  static fromStored(stored: StoredRoot): FileSystemAccessFS {
    return new FileSystemAccessFS(stored as unknown as FileSystemDirectoryHandle);
  }

  toStored(): StoredRoot {
    return this.#root as unknown as StoredRoot;
  }

  /** Whether `stored` is the same folder on disk as this one. */
  async isSameRoot(stored: StoredRoot): Promise<boolean> {
    return this.#root.isSameEntry(stored as unknown as FileSystemDirectoryHandle);
  }

  async queryPermission(): Promise<ReadPermission> {
    return this.#root.queryPermission({ mode: "read" });
  }

  /** Needs a user gesture, except where the browser can re-grant silently (installed app). */
  async requestPermission(): Promise<ReadPermission> {
    return this.#root.requestPermission({ mode: "read" });
  }

  get name(): string {
    return this.#root.name;
  }

  async #dir(path: string): Promise<FileSystemDirectoryHandle> {
    let dir = this.#root;
    try {
      for (const segment of splitPath(path)) dir = await dir.getDirectoryHandle(segment);
    } catch (error) {
      throw toFsError(error, path, "not-a-directory");
    }
    return dir;
  }

  async #file(rawPath: string): Promise<File> {
    const path = normalizePath(rawPath);
    if (path === "") throw new FsError("not-a-file", path);
    const dir = await this.#dir(dirname(path));
    try {
      return await (await dir.getFileHandle(basename(path))).getFile();
    } catch (error) {
      throw toFsError(error, path, "not-a-file");
    }
  }

  async list(rawPath: string): Promise<FsEntry[]> {
    const path = normalizePath(rawPath);
    const dir = await this.#dir(path);
    const entries: FsEntry[] = [];
    try {
      for await (const [name, handle] of dir.entries()) {
        entries.push({ kind: handle.kind, name, path: path ? `${path}/${name}` : name });
      }
    } catch (error) {
      throw toFsError(error, path, "not-a-directory");
    }
    return entries;
  }

  async stat(rawPath: string): Promise<FsStat> {
    const path = normalizePath(rawPath);
    const directory = { kind: "directory", path, size: 0, lastModified: 0 } as const;
    if (path === "") return { ...directory, name: this.name };
    try {
      const file = await this.#file(path);
      return {
        kind: "file",
        name: file.name,
        path,
        size: file.size,
        lastModified: file.lastModified,
      };
    } catch (error) {
      if (!(error instanceof FsError && error.code === "not-a-file")) throw error;
      await this.#dir(path);
      return { ...directory, name: basename(path) };
    }
  }

  async readText(path: string): Promise<string> {
    return (await this.#file(path)).text();
  }

  async readBlob(path: string): Promise<Blob> {
    return this.#file(path);
  }

  /** Live changes through `FileSystemObserver`, recursive from the root. */
  async watch(onChange: (changes: FsChange[]) => void): Promise<(() => void) | null> {
    if (!capabilities.hasFileSystemObserver) return null;
    const observer = new FileSystemObserver((records) => onChange(records.flatMap(toChanges)));
    try {
      await observer.observe(this.#root, { recursive: true });
    } catch {
      return null;
    }
    return () => observer.disconnect();
  }
}

function toChanges(record: FileSystemChangeRecord): FsChange[] {
  const path = record.relativePathComponents.join("/");
  switch (record.type) {
    case "appeared":
      return [{ type: "added", path }];
    case "disappeared":
      return [{ type: "removed", path }];
    case "modified":
      return [{ type: "modified", path }];
    case "moved":
      return [
        { type: "removed", path: record.relativePathMovedFrom?.join("/") ?? "" },
        { type: "added", path },
      ];
    default:
      return [{ type: "unknown", path: "" }];
  }
}
