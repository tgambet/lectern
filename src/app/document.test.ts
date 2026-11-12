import { describe, expect, it } from "vite-plus/test";
import { MemoryFS } from "../fs/memory-fs.ts";
import { buildFileIndex } from "../tree/file-index.ts";
import { createIgnoreRule } from "../tree/ignore.ts";
import { MAX_DISPLAY_BYTES, formatSize, loadDocument } from "./document.ts";

async function source(files: Record<string, string>) {
  const fs = new MemoryFS("repo", files);
  return { fs, index: await buildFileIndex(fs, { ignore: createIgnoreRule() }), folderId: "f1" };
}

describe("loadDocument", () => {
  it("renders Markdown with highlighted code", async () => {
    const view = await loadDocument(
      await source({ "a.md": "# A\n\n```js\nlet x = 1;\n```\n" }),
      "a.md",
    );
    expect(view.kind).toBe("markdown");
    if (view.kind === "markdown") expect(view.rendered.title).toBe("A");
  });

  it("classifies other paths", async () => {
    const src = await source({
      "a.html": "<p>static</p>",
      "s.html": "<script>1</script>",
      "b.py": "",
      "big.md": "x".repeat(MAX_DISPLAY_BYTES + 1),
    });
    expect(await loadDocument(src, "a.html")).toEqual({
      kind: "html",
      path: "a.html",
      hasScripts: false,
    });
    expect(await loadDocument(src, "s.html")).toMatchObject({ kind: "html", hasScripts: true });
    expect((await loadDocument(src, "b.py")).kind).toBe("other");
    expect((await loadDocument(src, "nope.md")).kind).toBe("missing");
    expect(await loadDocument(src, "big.md")).toMatchObject({ kind: "too-large" });
  });

  it("formats sizes for people", () => {
    expect(formatSize(2048)).toBe("2 KB");
    expect(formatSize(3.2 * 1024 * 1024)).toBe("3.2 MB");
  });
});
