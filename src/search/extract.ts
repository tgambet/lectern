/**
 * Plain text of a document, split into the fields the index weighs
 * separately. Runs in the search worker: no DOM.
 */
import type { Element, Root as HastRoot } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toString as hastText } from "hast-util-to-string";
import type { Root as MdastRoot } from "mdast";
import { toString as mdText } from "mdast-util-to-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import { parse as parseYaml } from "yaml";
import { basename } from "../fs/path.ts";
import type { DocumentKind } from "../tree/documents.ts";

export interface ExtractedText {
  title: string;
  headings: string;
  body: string;
}

/** Body text kept per document, for indexing and snippets. */
export const MAX_BODY_CHARS = 200_000;

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

function frontmatterTitle(tree: MdastRoot): string | null {
  const first = tree.children[0];
  if (first?.type !== "yaml") return null;
  try {
    const data: unknown = parseYaml(first.value);
    const title = data && typeof data === "object" ? (data as Record<string, unknown>).title : null;
    return typeof title === "string" ? title : null;
  } catch {
    return null;
  }
}

export function extractMarkdown(source: string, path: string): ExtractedText {
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ["yaml"])
    .parse(source) as MdastRoot;
  const headings: string[] = [];
  let h1: string | null = null;
  visit(tree, "heading", (node) => {
    const text = squash(mdText(node, { includeHtml: false }));
    if (node.depth === 1 && h1 === null) h1 = text;
    headings.push(text);
  });
  // Text per block, so list items and table cells do not run into each other; inline HTML is dropped.
  const body: string[] = [];
  const blocks = new Set(["paragraph", "tableCell", "code"]);
  visit(tree, (node) => {
    if (node.type === "heading" || node.type === "yaml" || node.type === "html") return SKIP;
    if (!blocks.has(node.type)) return undefined;
    body.push(mdText(node, { includeHtml: false }));
    return SKIP;
  });
  return {
    title: frontmatterTitle(tree) ?? h1 ?? basename(path),
    headings: headings.join(" · "),
    body: squash(body.join(" ")).slice(0, MAX_BODY_CHARS),
  };
}

const BLOCKS = new Set(
  "address article aside blockquote br dd div dl dt figcaption figure footer h1 h2 h3 h4 h5 h6 header hr li main nav ol p pre section table td th tr ul".split(
    " ",
  ),
);

export function extractHtml(source: string, path: string): ExtractedText {
  const tree = fromHtml(source) as HastRoot;
  let title: string | null = null;
  const headings: string[] = [];
  visit(tree, "element", (node: Element, index, parent) => {
    if (node.tagName === "script" || node.tagName === "style" || node.tagName === "template") {
      if (parent && index !== undefined) parent.children.splice(index, 1);
      return index;
    }
    if (node.tagName === "title" && title === null) title = squash(hastText(node));
    if (/^h[1-6]$/.test(node.tagName)) headings.push(squash(hastText(node)));
    // Block boundaries separate words in the extracted text.
    if (BLOCKS.has(node.tagName)) node.children.push({ type: "text", value: " " });
    return undefined;
  });
  let bodyNode: Element | undefined;
  visit(tree, "element", (node: Element) => {
    if (node.tagName === "body") bodyNode = node;
  });
  return {
    title: title || headings[0] || basename(path),
    headings: headings.join(" · "),
    body: squash(hastText(bodyNode ?? tree)).slice(0, MAX_BODY_CHARS),
  };
}

export function extractText(kind: DocumentKind, source: string, path: string): ExtractedText {
  return kind === "markdown" ? extractMarkdown(source, path) : extractHtml(source, path);
}
