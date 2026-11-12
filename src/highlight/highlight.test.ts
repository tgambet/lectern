import { toHtml } from "hast-util-to-html";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { readUrl } from "../app/routes.ts";
import { renderMarkdown } from "../markdown/pipeline.ts";
import { hasCodeBlocks, highlightCodeBlocks } from "./highlight.ts";
import { grammarFor, grammars } from "./languages.ts";

async function highlighted(md: string) {
  const { tree } = await renderMarkdown(md, {
    docPath: "a.md",
    folderName: "r",
    rootId: "x",
    lookup: () => null,
    readUrl,
  });
  await highlightCodeBlocks(tree);
  return { tree, html: toHtml(tree) };
}

describe("highlighting", () => {
  afterEach(() => vi.restoreAllMocks());

  it("ships exactly 40 grammars and resolves aliases", () => {
    expect(Object.keys(grammars)).toHaveLength(40);
    expect(grammarFor("TS")).toBe("typescript");
    expect(grammarFor("sh")).toBe("shellscript");
    expect(grammarFor("brainfuck")).toBeNull();
  });

  it("maps tokens to design-system classes, with no inline style", async () => {
    const { tree, html } = await highlighted(
      '```ts\nconst answer: number = 42; // yes\nconst s = "x";\n```',
    );
    expect(hasCodeBlocks(tree)).toBe(true);
    expect(html).toContain('data-lang="ts"');
    for (const cls of ["tk-kw", "tk-num", "tk-cm", "tk-str"])
      expect(html).toContain(`class="${cls}"`);
    expect(html).not.toContain("style=");
    expect(html).toContain('class="line"');
  });

  it("tokenizes whole lines however slow the machine is", async () => {
    // Every clock read is a second later: any time budget is exceeded at once.
    let now = 0;
    vi.spyOn(Date, "now").mockImplementation(() => (now += 1000));
    const { html } = await highlighted("```ts\nconst answer = 42; // yes\n```");
    expect(html).toContain('class="tk-cm"');
  });

  it("leaves over-long lines plain, and keeps highlighting the next ones", async () => {
    const long = `const a = "${"x".repeat(2000)}";`;
    const { html } = await highlighted(`\`\`\`ts\n${long}\nconst b = 1;\n\`\`\``);
    expect(html).toContain(long);
    expect(html.match(/class="tk-kw"/g)).toHaveLength(1);
  });

  it("leaves unknown languages as plain text, labelled", async () => {
    const { html } = await highlighted("```brainfuck\n+++.\n```\n\n```\nplain\n```");
    expect(html).toContain('data-lang="brainfuck"');
    expect(html).toContain('data-lang="text"');
    expect(html).not.toContain("tk-");
  });

  it("does not let highlighting unescape code", async () => {
    const { html } = await highlighted("```html\n<script>alert(1)</script>\n```");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&#x3C;");
  });
});
