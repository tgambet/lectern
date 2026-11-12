import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";
import { resolvePath } from "../../fs/path.ts";
import { documentKind } from "../../tree/documents.ts";

export interface LinkContext {
  /** Path of the document being rendered, root-relative. */
  docPath: string;
  folderName: string;
  /** Folder id used by the virtual file server. */
  rootId: string;
  lookup(path: string): "file" | "directory" | null;
  readUrl(folder: string, path: string, hash?: string): string;
}

const SCHEME = /^[a-z][a-z\d+.-]*:/i;
const CLOBBER_PREFIX = "user-content-";

function split(href: string): { path: string; hash: string } {
  const noQuery = href.replace(/\?[^#]*/, "");
  const i = noQuery.indexOf("#");
  return i === -1
    ? { path: noQuery, hash: "" }
    : { path: noQuery.slice(0, i), hash: noQuery.slice(i + 1) };
}

function decode(path: string): string {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

export function fileUrl(ctx: LinkContext, path: string): string {
  return `/~/${ctx.rootId}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function markBroken(node: Element, original: string) {
  node.properties.dataLink = "broken";
  node.properties.className = ["lc-broken"];
  node.properties.title = `No file at ${original}`;
}

/** `#x` and `aria-describedby` point at `user-content-x` when the sanitizer prefixed that id. */
function fixLocalReference(value: string, ids: ReadonlySet<string>): string {
  return !ids.has(value) && ids.has(CLOBBER_PREFIX + value) ? CLOBBER_PREFIX + value : value;
}

function rewriteAnchor(node: Element, ctx: LinkContext, ids: ReadonlySet<string>) {
  const describedBy = node.properties.ariaDescribedBy;
  if (Array.isArray(describedBy)) {
    node.properties.ariaDescribedBy = describedBy.map((id) => fixLocalReference(String(id), ids));
  }
  const href = node.properties.href;
  if (typeof href !== "string" || href === "") return;
  if (SCHEME.test(href) || href.startsWith("//")) {
    node.properties.dataLink = "external";
    node.properties.target = "_blank";
    node.properties.rel = ["noopener", "noreferrer"];
    return;
  }
  if (href.startsWith("#")) {
    node.properties.href = `#${fixLocalReference(decode(href.slice(1)), ids)}`;
    return;
  }
  const { path, hash } = split(href);
  const target = resolvePath(ctx.docPath, decode(path));
  const kind = target === null ? null : ctx.lookup(target);
  if (target === null || kind === null) {
    node.properties.href = target === null ? "#" : ctx.readUrl(ctx.folderName, target, hash);
    markBroken(node, href);
    return;
  }
  if (kind === "directory" || documentKind(target)) {
    node.properties.href = ctx.readUrl(ctx.folderName, target, hash);
    node.properties.dataLink = "internal";
  } else {
    node.properties.href = fileUrl(ctx, target);
    node.properties.dataLink = "file";
    node.properties.target = "_blank";
  }
}

function rewriteImage(
  node: Element,
  ctx: LinkContext,
  parent: { children: unknown[] },
  index: number,
) {
  const src = node.properties.src;
  if (typeof src !== "string" || src === "") return;
  if (SCHEME.test(src) || src.startsWith("//")) {
    // Remote images would need the network: show their description instead.
    const alt = typeof node.properties.alt === "string" ? node.properties.alt : "";
    parent.children[index] = {
      type: "element",
      tagName: "span",
      properties: { className: ["lc-remote-img"], title: `Remote image not loaded: ${src}` },
      children: [{ type: "text", value: alt || "Remote image" }],
    };
    return;
  }
  const target = resolvePath(ctx.docPath, decode(split(src).path));
  if (target === null || ctx.lookup(target) !== "file") {
    node.properties.src = "";
    markBroken(node, src);
    return;
  }
  node.properties.src = fileUrl(ctx, target);
}

/**
 * Points relative links at in-app routes (documents, folders) or at the
 * virtual file server (other files and images), and marks broken ones.
 * Runs after sanitization, so it only ever sees allowed URLs.
 */
export function rehypeRewriteLinks(ctx: LinkContext) {
  return (tree: Root) => {
    const ids = new Set<string>();
    visit(tree, "element", (node) => {
      if (typeof node.properties.id === "string") ids.add(node.properties.id);
    });
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName === "a") rewriteAnchor(node, ctx, ids);
      else if (node.tagName === "img" && parent && index !== undefined)
        rewriteImage(node, ctx, parent, index);
    });
  };
}
