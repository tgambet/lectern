import { toHtml } from "hast-util-to-html";
import { describe, expect, it } from "vite-plus/test";
import { readUrl } from "../app/routes.ts";
import { renderMarkdown, type LinkContext } from "./pipeline.ts";

const files = new Set([
  "README.md",
  "docs/guide.md",
  "docs/api.html",
  "docs/img/a.png",
  "spec.pdf",
]);
const dirs = new Set(["", "docs", "docs/img"]);

const ctx = (docPath = "docs/guide.md"): LinkContext => ({
  docPath,
  folderName: "repo",
  rootId: "r1",
  lookup: (p) => (files.has(p) ? "file" : dirs.has(p) ? "directory" : null),
  readUrl,
});

async function html(md: string, docPath?: string) {
  return toHtml((await renderMarkdown(md, ctx(docPath))).tree);
}

describe("tables", () => {
  it("wraps each table in its own scrolling box", async () => {
    const out = await html("| a |\n|---|\n| 1 |\n\n<table><tr><td>raw</td></tr></table>\n");
    expect(out.match(/<div class="lc-table-scroll"><table>/g)).toHaveLength(2);
  });
});

describe("GFM", () => {
  it("renders tables, task lists, strikethrough, autolinks and footnotes", async () => {
    const out = await html(
      "| a | b |\n|---|:-:|\n| 1 | 2 |\n\n- [x] done\n- [ ] todo\n\n~~old~~ www.example.com\n\nNote[^1]\n\n[^1]: Footnote.\n",
    );
    expect(out).toContain("<table>");
    expect(out).toContain('align="center"');
    expect(out).toMatch(/<input type="checkbox" checked disabled>/);
    expect(out).toContain("<del>old</del>");
    expect(out).toContain('href="http://www.example.com"');
    expect(out).toContain('href="#user-content-fn-1"');
    expect(out).toContain('id="user-content-fn-1"');
    expect(out).toContain('href="#user-content-fnref-1"');
    expect(out).toContain('id="user-content-fnref-1"');
    expect(out).toContain('aria-describedby="user-content-footnote-label"');
  });
});

describe("sanitization", () => {
  it.each([
    ["<script>alert(1)</script>", "<script"],
    ['<img src="docs/img/a.png" onerror="alert(1)">', "onerror"],
    ['<a href="javascript:alert(1)">x</a>', "javascript:"],
    ['<iframe src="https://evil.test"></iframe>', "<iframe"],
    ['<form action="https://evil.test"><input name="q"></form>', "<form"],
    ['<div style="background:url(https://evil.test)">x</div>', "style="],
    ["<object data=x.swf></object>", "<object"],
    ['<svg><a href="javascript:alert(1)">x</a></svg>', "javascript:"],
    ['<a href="data:text/html,<script>alert(1)</script>">x</a>', "data:"],
  ])("removes %s", async (input, forbidden) => {
    expect(await html(input)).not.toContain(forbidden);
  });

  it("keeps details, kbd and author ids behind a prefix", async () => {
    const out = await html(
      '<details><summary>More</summary>Hidden</details>\n\n<kbd>Ctrl</kbd> <span id="app">x</span>',
    );
    expect(out).toContain("<details><summary>More</summary>");
    expect(out).toContain("<kbd>Ctrl</kbd>");
    expect(out).toContain('id="user-content-app"');
  });

  it("points local anchors at prefixed author ids, but not at heading slugs", async () => {
    const out = await html('## Setup\n\n<a id="raw"></a>\n\n[a](#raw) [b](#setup) [c](#nowhere)');
    expect(out).toContain('href="#user-content-raw"');
    expect(out).toContain('href="#setup"');
    expect(out).toContain('href="#nowhere"');
  });

  it("keeps fenced code languages only in the expected form", async () => {
    expect(await html("```ts\nconst a = 1;\n```")).toContain('class="language-ts"');
    expect(await html('<code class="language-ts evil">x</code>')).not.toContain("evil");
  });
});

describe("links", () => {
  it("routes document and folder links in-app, keeping anchors", async () => {
    const out = await html("[a](../README.md#intro) [b](api.html) [c](./) [d](#local) [e](/docs)");
    expect(out).toContain('href="/read/repo/README.md#intro" data-link="internal"');
    expect(out).toContain('href="/read/repo/docs/api.html" data-link="internal"');
    expect(out).toContain('href="/read/repo/docs" data-link="internal"');
    expect(out).toContain('href="#local"');
    expect(out).toContain('href="/read/repo/docs" data-link="internal">e');
  });

  it("serves other files and images through the virtual file server", async () => {
    const out = await html("[spec](../spec.pdf) ![logo](img/a.png)");
    expect(out).toContain('href="/~/r1/spec.pdf" data-link="file" target="_blank"');
    expect(out).toContain('src="/~/r1/docs/img/a.png"');
  });

  it("marks broken links and images", async () => {
    const out = await html("[gone](../guides/setup.md) [out](../../etc/passwd) ![x](missing.png)");
    expect(out).toContain('class="lc-broken" title="No file at ../guides/setup.md"');
    expect(out).toContain('title="No file at ../../etc/passwd"');
    expect(out).toContain('title="No file at missing.png"');
  });

  it("opens external links in a new tab without referrer", async () => {
    expect(await html("[x](https://example.com)")).toContain(
      'href="https://example.com" data-link="external" target="_blank" rel="noopener noreferrer"',
    );
  });

  it("replaces remote images with their description", async () => {
    const out = await html("![build status](https://ci.example.com/badge.svg)");
    expect(out).not.toContain("<img");
    expect(out).toContain('<span class="lc-remote-img"');
    expect(out).toContain(">build status</span>");
  });

  it("decodes percent-encoded paths", async () => {
    expect(await html("[x](../README%2Emd)", "docs/guide.md")).toContain('data-link="internal"');
  });
});

describe("outline", () => {
  it("slugs headings and builds the table of contents", async () => {
    const result = await renderMarkdown(
      "# Title\n\n## First part\n\n### Detail\n\n## First part\n",
      ctx(),
    );
    expect(result.title).toBe("Title");
    expect(result.toc).toEqual([
      { depth: 2, id: "first-part", text: "First part" },
      { depth: 3, id: "detail", text: "Detail" },
      { depth: 2, id: "first-part-1", text: "First part" },
    ]);
  });

  it("reads frontmatter, prefers its title, and does not render it", async () => {
    const result = await renderMarkdown(
      "---\ntitle: From front\ntags: [a]\n---\n\n# Heading\n",
      ctx(),
    );
    expect(result.title).toBe("From front");
    expect(result.frontmatter).toEqual({ title: "From front", tags: ["a"] });
    expect(toHtml(result.tree)).not.toContain("tags");
  });

  it("ignores malformed frontmatter", async () => {
    const result = await renderMarkdown("---\n: : :\n  - [\n---\n\nText\n", ctx());
    expect(result.frontmatter).toBeNull();
  });
});

describe("GitHub alerts", () => {
  it("turns marked blockquotes into notices with their label", async () => {
    const out = await html("> [!WARNING]\n> Back up **first**.\n\n> [!tip]\n> Any case.");
    expect(out).toContain('<div class="lc-notice lc-notice--warn" role="note">');
    expect(out).toContain('<p class="lc-notice__head"><lc-icon name="alert"></lc-icon>Warning</p>');
    expect(out).toContain("<p>Back up <strong>first</strong>.</p>");
    expect(out).toContain('<lc-icon name="info"></lc-icon>Tip</p>\n<p>Any case.</p>');
    expect(out).not.toContain("[!");
  });

  it("leaves other blockquotes, unknown markers and forged icons alone", async () => {
    // As on GitHub, the marker stands alone on its line.
    const out = await html(
      '> [!DANGER]\n> no\n\n> [!NOTE] same line\n\n<lc-icon name="alert"></lc-icon>',
    );
    expect(out).not.toContain("lc-notice");
    expect(out).toContain("<blockquote>");
    expect(out).not.toContain("<lc-icon");
  });
});

describe("document classes", () => {
  it("keeps the design-system classes of the allowlist", async () => {
    const out = await html(
      '<div class="lc-notice lc-notice--warn"><p class="lc-notice__head">Heads up</p><p>Text</p></div>\n\n<p class="lc-lede">Intro</p>\n',
    );
    expect(out).toContain('class="lc-notice lc-notice--warn"');
    expect(out).toContain('class="lc-notice__head"');
    expect(out).toContain('class="lc-lede"');
  });

  it("drops every other class, including the app's own", async () => {
    const out = await html(
      '<a href="x.md" class="lc-btn foo lc-broken">x</a> <p class="lc-sr-only">y</p>\n',
    );
    expect(out).not.toContain("lc-btn");
    expect(out).not.toContain("lc-sr-only");
    expect(out).not.toContain("foo");
  });
});
