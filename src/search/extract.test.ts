import { describe, expect, it } from "vite-plus/test";
import { extractHtml, extractMarkdown } from "./extract.ts";
import { snippet } from "./snippet.ts";

describe("extractMarkdown", () => {
  it("separates title, headings and body", () => {
    const out = extractMarkdown(
      "---\ntitle: Front title\n---\n\n# Heading one\n\nSome **body** text.\n\n## Offline cache\n\n- item\n\n```js\nconst x = 1;\n```\n\n<div>raw</div>\n",
      "docs/a.md",
    );
    expect(out.title).toBe("Front title");
    expect(out.headings).toBe("Heading one · Offline cache");
    expect(out.body).toBe("Some body text. item const x = 1;");
  });

  it("separates list items and drops inline HTML", () => {
    const out = extractMarkdown(
      "- first (item).\n- second\n\nPress <kbd>/</kbd> to search.\n\n| a | b |\n|---|---|\n| c | d |\n",
      "a.md",
    );
    expect(out.body).toBe("first (item). second Press / to search. a b c d");
  });

  it("falls back to the first h1, then the file name", () => {
    expect(extractMarkdown("# Only\n\ntext", "a.md").title).toBe("Only");
    expect(extractMarkdown("text", "docs/guide.md").title).toBe("guide.md");
  });
});

describe("extractHtml", () => {
  it("reads title, headings and visible body text, never scripts or styles", () => {
    const out = extractHtml(
      "<html><head><title>API</title><style>h1{}</style></head><body><h1>Reference</h1><p>Call <code>open()</code>.</p><script>secret()</script></body></html>",
      "api.html",
    );
    expect(out.title).toBe("API");
    expect(out.headings).toBe("Reference");
    expect(out.body).toBe("Reference Call open().");
  });
});

describe("snippet", () => {
  const text =
    "Lectern reads a folder. Documents are served from the offline cache once the app is installed, so reading works without a network.";

  it("centres on the first match and marks every matched term", () => {
    const parts = snippet(text, ["offline", "cache"], 30);
    const marked = parts.filter((p) => p.match).map((p) => p.text);
    expect(marked).toEqual(["offline", "cache"]);
    expect(parts[0]).toEqual({ text: "… ", match: false });
    expect(parts.at(-1)).toEqual({ text: " …", match: false });
  });

  it("matches case-insensitively and survives regex characters", () => {
    expect(snippet("Use C++ (often).", ["c++"]).find((p) => p.match)?.text).toBe("C++");
  });

  it("returns the opening words when no term occurs", () => {
    expect(snippet("abc def", ["zzz"])).toEqual([{ text: "abc def", match: false }]);
  });
});
