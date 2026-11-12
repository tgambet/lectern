import { basename, dirname, splitPath } from "../fs/path.ts";
import { documentKind } from "./documents.ts";
import type { FileIndex } from "./file-index.ts";

export interface TreeNode {
  kind: "file" | "directory";
  name: string;
  path: string;
  children: TreeNode[];
}

export interface TreeRow {
  node: TreeNode;
  depth: number;
  /** Path of the row's parent node, "" at the top level. */
  parent: string;
}

/** How the tree is shown: nested, nested with single-folder chains merged, or a list of paths. */
export type TreeView = "tree" | "compact" | "flat";

export function parseTreeView(value: string | null): TreeView {
  return value === "compact" || value === "flat" ? value : "tree";
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function compare(a: TreeNode, b: TreeNode): number {
  if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
  return collator.compare(a.name, b.name);
}

/** The documents of an index as a tree: folders without documents are left out. */
export function buildDocumentTree(index: FileIndex, rootName: string): TreeNode {
  const root: TreeNode = { kind: "directory", name: rootName, path: "", children: [] };
  const dirs = new Map<string, TreeNode>([["", root]]);

  const dirNode = (path: string): TreeNode => {
    const existing = dirs.get(path);
    if (existing) return existing;
    const node: TreeNode = { kind: "directory", name: basename(path), path, children: [] };
    dirs.set(path, node);
    dirNode(dirname(path)).children.push(node);
    return node;
  };

  for (const file of index.files) {
    if (!documentKind(file)) continue;
    dirNode(dirname(file)).children.push({
      kind: "file",
      name: basename(file),
      path: file,
      children: [],
    });
  }
  for (const node of dirs.values()) node.children.sort(compare);
  return root;
}

/** Rows currently shown, depth-first, given which folders are expanded. */
export function visibleRows(root: TreeNode, expanded: ReadonlySet<string>): TreeRow[] {
  const rows: TreeRow[] = [];
  const walk = (node: TreeNode, depth: number) => {
    for (const child of node.children) {
      rows.push({ node: child, depth, parent: node.path });
      if (child.kind === "directory" && expanded.has(child.path)) walk(child, depth + 1);
    }
  };
  walk(root, 0);
  return rows;
}

/** Every file as a top-level row, in tree order; the row's name is its full path. */
export function flatRows(root: TreeNode): TreeRow[] {
  const rows: TreeRow[] = [];
  const walk = (node: TreeNode) => {
    for (const child of node.children) {
      if (child.kind === "directory") walk(child);
      else rows.push({ node: { ...child, name: child.path }, depth: 0, parent: "" });
    }
  };
  walk(root);
  return rows;
}

/**
 * The files whose path contains `query` (any case), with the folders leading
 * to them. An empty query keeps everything.
 */
export function filterTree(root: TreeNode, query: string): TreeNode {
  const q = query.trim().toLowerCase();
  if (q === "") return root;
  const prune = (node: TreeNode): TreeNode | null => {
    if (node.kind === "file") return node.path.toLowerCase().includes(q) ? node : null;
    const children = node.children.map(prune).filter((c): c is TreeNode => c !== null);
    return children.length ? { ...node, children } : null;
  };
  return { ...root, children: root.children.map(prune).filter((c): c is TreeNode => c !== null) };
}

/**
 * Merges chains of folders that hold a single folder into one node named
 * `a/b/c`, carrying the innermost path (VS Code's compact folders).
 */
export function compactTree(root: TreeNode): TreeNode {
  const compact = (node: TreeNode): TreeNode => {
    if (node.kind === "file") return node;
    let inner = node;
    let name = node.name;
    while (inner.children.length === 1 && inner.children[0]!.kind === "directory") {
      inner = inner.children[0]!;
      name += `/${inner.name}`;
    }
    return { ...inner, name, children: inner.children.map(compact) };
  };
  return { ...root, children: root.children.map(compact) };
}

/** Paths of every folder under `root`, for expand all. */
export function directoryPaths(root: TreeNode): string[] {
  const paths: string[] = [];
  const walk = (node: TreeNode) => {
    for (const child of node.children) {
      if (child.kind !== "directory") continue;
      paths.push(child.path);
      walk(child);
    }
  };
  walk(root);
  return paths;
}

/** Folder paths containing `path`, outermost first, excluding the root. */
export function ancestorsOf(path: string): string[] {
  const parts = splitPath(path);
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join("/"));
}
