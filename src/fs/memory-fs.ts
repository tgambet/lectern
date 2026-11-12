import { FsError } from "./errors.ts";
import { basename, normalizePath, splitPath } from "./path.ts";
import type { FsEntry, FsStat, VirtualFS } from "./virtual-fs.ts";

export type MemoryFileInit =
  | string
  | Uint8Array
  | { content: string | Uint8Array; lastModified?: number };

interface FileNode {
  kind: "file";
  bytes: Uint8Array;
  lastModified: number;
}

interface DirNode {
  kind: "directory";
  children: Map<string, FileNode | DirNode>;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** An in-memory folder for tests, fixtures and demo mode. Directories are implied by file paths. */
export class MemoryFS implements VirtualFS {
  readonly name: string;
  readonly #root: DirNode = { kind: "directory", children: new Map() };

  constructor(name: string, files: Record<string, MemoryFileInit>, defaultLastModified = 0) {
    this.name = name;
    for (const [path, init] of Object.entries(files)) {
      const { content, lastModified } =
        typeof init === "string" || init instanceof Uint8Array ? { content: init } : init;
      this.#addFile(normalizePath(path), {
        kind: "file",
        bytes: typeof content === "string" ? encoder.encode(content) : content,
        lastModified: lastModified ?? defaultLastModified,
      });
    }
  }

  #addFile(path: string, file: FileNode): void {
    const segments = splitPath(path);
    const fileName = segments.pop();
    if (fileName === undefined) throw new FsError("invalid-path", path);
    let dir = this.#root;
    for (const segment of segments) {
      let next = dir.children.get(segment);
      if (next === undefined) {
        next = { kind: "directory", children: new Map() };
        dir.children.set(segment, next);
      }
      if (next.kind !== "directory") throw new FsError("not-a-directory", path);
      dir = next;
    }
    if (dir.children.get(fileName)?.kind === "directory") throw new FsError("not-a-file", path);
    dir.children.set(fileName, file);
  }

  #get(rawPath: string): { path: string; node: FileNode | DirNode } {
    const path = normalizePath(rawPath);
    let node: FileNode | DirNode = this.#root;
    for (const segment of splitPath(path)) {
      const next: FileNode | DirNode | undefined =
        node.kind === "directory" ? node.children.get(segment) : undefined;
      if (next === undefined) throw new FsError("not-found", path);
      node = next;
    }
    return { path, node };
  }

  #file(rawPath: string): FileNode {
    const { path, node } = this.#get(rawPath);
    if (node.kind !== "file") throw new FsError("not-a-file", path);
    return node;
  }

  async list(rawPath: string): Promise<FsEntry[]> {
    const { path, node } = this.#get(rawPath);
    if (node.kind !== "directory") throw new FsError("not-a-directory", path);
    return [...node.children].map(([name, child]) => ({
      kind: child.kind,
      name,
      path: path ? `${path}/${name}` : name,
    }));
  }

  async stat(rawPath: string): Promise<FsStat> {
    const { path, node } = this.#get(rawPath);
    const name = path === "" ? this.name : basename(path);
    return node.kind === "file"
      ? { kind: "file", name, path, size: node.bytes.byteLength, lastModified: node.lastModified }
      : { kind: "directory", name, path, size: 0, lastModified: 0 };
  }

  async readText(path: string): Promise<string> {
    return decoder.decode(this.#file(path).bytes);
  }

  async readBlob(path: string): Promise<Blob> {
    return new Blob([this.#file(path).bytes.slice()]);
  }
}
