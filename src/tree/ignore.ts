import ignore from "ignore";

/** Folders skipped by default: tooling output and dependencies, rarely documentation. */
export const DEFAULT_IGNORED_NAMES = [".git", "node_modules", "dist", "build", "target", "vendor"];

export interface IgnoreOptions {
  /** Entry names skipped at any depth. */
  names?: string[];
  /** Skip entries whose name starts with a dot. */
  hidden?: boolean;
  /** Contents of the root `.gitignore`, honoured when given. */
  gitignore?: string;
}

export type IgnoreRule = (path: string, kind: "file" | "directory") => boolean;

export function createIgnoreRule(options: IgnoreOptions = {}): IgnoreRule {
  const names = new Set(options.names ?? DEFAULT_IGNORED_NAMES);
  const hidden = options.hidden ?? true;
  const git = options.gitignore ? ignore().add(options.gitignore) : null;
  return (path, kind) => {
    const name = path.slice(path.lastIndexOf("/") + 1);
    if (names.has(name)) return true;
    if (hidden && name.startsWith(".")) return true;
    return git !== null && git.ignores(kind === "directory" ? `${path}/` : path);
  };
}
