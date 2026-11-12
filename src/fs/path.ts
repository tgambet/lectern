/**
 * Paths inside a folder: `/`-separated, relative to the folder root, no
 * leading or trailing slash. The root itself is `""`. Pure functions, shared
 * by every VirtualFS implementation and by link rewriting.
 */
import { FsError } from "./errors.ts";

/** Normalizes a root-relative path. Throws `invalid-path` if it climbs above the root. */
export function normalizePath(path: string): string {
  const out: string[] = [];
  for (const segment of path.replace(/\\/g, "/").split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (out.length === 0) throw new FsError("invalid-path", path);
      out.pop();
    } else {
      out.push(segment);
    }
  }
  return out.join("/");
}

/** `null` when `relative` points outside the folder. */
export function resolvePath(fromFile: string, relative: string): string | null {
  const base = relative.startsWith("/") ? "" : dirname(fromFile);
  try {
    return normalizePath(base ? `${base}/${relative}` : relative);
  } catch {
    return null;
  }
}

export function joinPath(...parts: string[]): string {
  return normalizePath(parts.filter(Boolean).join("/"));
}

export function dirname(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

export function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

/** Lower-cased extension with its dot, `""` when there is none. Dotfiles have none. */
export function extname(path: string): string {
  const name = basename(path);
  const i = name.lastIndexOf(".");
  return i <= 0 ? "" : name.slice(i).toLowerCase();
}

export function splitPath(path: string): string[] {
  return path === "" ? [] : path.split("/");
}
