/**
 * Markdown → sanitized HAST. The plugin list is explicit and ordered; add new
 * syntax before `remark-rehype`, new HTML transforms after `rehype-sanitize`
 * (anything after it must only produce trusted markup).
 */
import type { Root } from "hast";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified, type PluggableList } from "unified";
import { VFile } from "vfile";
import { rehypeAlerts } from "./plugins/alerts.ts";
import { remarkFrontmatterData, type FrontmatterData } from "./plugins/frontmatter.ts";
import { rehypeRewriteLinks, type LinkContext } from "./plugins/rewrite-links.ts";
import { rehypeScrollableTables } from "./plugins/tables.ts";
import { rehypeOutline, type OutlineData, type TocEntry } from "./plugins/toc.ts";
import { sanitizeSchema } from "./schema.ts";

export type { LinkContext, TocEntry };

export function markdownPlugins(ctx: LinkContext): PluggableList {
  return [
    // Markdown syntax
    remarkGfm,
    [remarkFrontmatter, ["yaml"]],
    remarkFrontmatterData,
    // To HTML; raw HTML is parsed, then sanitized like everything else
    // The sanitizer prefixes ids (`user-content-`); remark-rehype must not prefix them twice.
    [remarkRehype, { allowDangerousHtml: true, clobberPrefix: "" }],
    rehypeRaw,
    [rehypeSanitize, sanitizeSchema],
    // Trusted transforms on sanitized output
    rehypeSlug,
    [rehypeRewriteLinks, ctx],
    rehypeAlerts,
    rehypeScrollableTables,
    rehypeOutline,
  ];
}

export interface RenderedMarkdown {
  tree: Root;
  toc: TocEntry[];
  /** Frontmatter `title`, else the first h1, else null. */
  title: string | null;
  frontmatter: Record<string, unknown> | null;
}

export async function renderMarkdown(source: string, ctx: LinkContext): Promise<RenderedMarkdown> {
  const processor = unified().use(remarkParse).use(markdownPlugins(ctx));
  const file = new VFile({ value: source, path: ctx.docPath });
  const tree = (await processor.run(processor.parse(file), file)) as Root;
  const data = file.data as Partial<OutlineData & FrontmatterData>;
  const fmTitle = data.frontmatter?.title;
  return {
    tree,
    toc: data.toc ?? [],
    title: typeof fmTitle === "string" ? fmTitle : (data.heading ?? null),
    frontmatter: data.frontmatter ?? null,
  };
}
