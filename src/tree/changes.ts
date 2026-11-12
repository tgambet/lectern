import type { FsChange } from "../fs/virtual-fs.ts";
import type { IgnoreRule } from "./ignore.ts";

/**
 * The changes that can affect what Lectern shows: anything outside ignored
 * folders and files (`.git`, `node_modules`, .gitignore matches), plus the
 * root `.gitignore` itself, which changes the rules.
 */
export function relevantChanges(changes: FsChange[], ignore: IgnoreRule | null): FsChange[] {
  return changes.filter(({ type, path }) => {
    if (type === "unknown" || path === ".gitignore" || !ignore) return true;
    const parts = path.split("/");
    return !parts.some((_, i) => {
      const prefix = parts.slice(0, i + 1).join("/");
      const isLast = i === parts.length - 1;
      // A removed entry's kind is unknown: test the last segment both ways.
      return isLast
        ? ignore(prefix, "file") || ignore(prefix, "directory")
        : ignore(prefix, "directory");
    });
  });
}

/** Whether a change may alter what `path` shows, including files next to or below it. */
export function touches(changes: ReadonlySet<string>, path: string): boolean {
  const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  for (const changed of changes) {
    if (changed === "" || dir === "" || changed === dir || changed.startsWith(`${dir}/`))
      return true;
  }
  return false;
}
