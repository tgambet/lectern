import { describe, expect, it } from "vite-plus/test";
import { MemoryFS, type MemoryFileInit } from "../fs/memory-fs.ts";
import { Indexer } from "./indexer.ts";
import { MemorySearchStore } from "./store.ts";

/** A MemoryFS whose reads are counted, to check incrementality. */
function countingFs(files: Record<string, MemoryFileInit>) {
  const fs = new MemoryFS("repo", files);
  const reads: string[] = [];
  const readText = fs.readText.bind(fs);
  fs.readText = async (path: string) => {
    reads.push(path);
    return readText(path);
  };
  return { fs, reads };
}

const files = {
  "README.md": { content: "# Lectern\n\nRead documentation offline.", lastModified: 1 },
  "docs/cache.md": {
    content: "# Offline cache\n\nThe service worker keeps the app shell.",
    lastModified: 1,
  },
  "docs/api.html": {
    content: "<title>API</title><h1>Reference</h1><p>Open a folder handle.</p>",
    lastModified: 1,
  },
  "src/main.ts": { content: "offline", lastModified: 1 },
};

describe("Indexer", () => {
  it("finds documents by title, headings and body, title first", async () => {
    const { fs } = countingFs(files);
    const indexer = new Indexer(fs, "f", new MemorySearchStore());
    await indexer.sync(Object.keys(files));
    expect(indexer.documentCount).toBe(3);
    const results = await indexer.search("offline");
    expect(results.map((r) => r.path)).toEqual(["docs/cache.md", "README.md"]);
    expect(results[0]!.title).toBe("Offline cache");
    expect((await indexer.search("handle"))[0]).toMatchObject({
      path: "docs/api.html",
      title: "API",
    });
  });

  it("matches prefixes and small typos, and requires every term", async () => {
    const { fs } = countingFs(files);
    const indexer = new Indexer(fs, "f", new MemorySearchStore());
    await indexer.sync(Object.keys(files));
    expect((await indexer.search("documen")).map((r) => r.path)).toEqual(["README.md"]);
    expect((await indexer.search("servise")).map((r) => r.path)).toEqual(["docs/cache.md"]);
    expect(await indexer.search("offline reference")).toEqual([]);
  });

  it("finds documents by file and folder name, and marks them in the path", async () => {
    const { fs } = countingFs(files);
    const indexer = new Indexer(fs, "f", new MemorySearchStore());
    await indexer.sync(Object.keys(files));
    const [result] = await indexer.search("cache");
    expect(result!.path).toBe("docs/cache.md");
    expect(result!.pathParts).toEqual([
      { text: "docs/", match: false },
      { text: "cache", match: true },
      { text: ".md", match: false },
    ]);
    expect((await indexer.search("docs api")).map((r) => r.path)).toEqual(["docs/api.html"]);
  });

  it("returns snippets with marked terms", async () => {
    const { fs } = countingFs(files);
    const indexer = new Indexer(fs, "f", new MemorySearchStore());
    await indexer.sync(Object.keys(files));
    const [result] = await indexer.search("worker");
    expect(result!.snippet.filter((p) => p.match).map((p) => p.text)).toEqual(["worker"]);
  });

  it("re-reads only changed documents, drops removed ones, and survives a restart", async () => {
    const store = new MemorySearchStore();
    const first = countingFs(files);
    await new Indexer(first.fs, "f", store).sync(Object.keys(files));
    expect(first.reads).toHaveLength(3);

    const changed = {
      ...files,
      "README.md": { content: "# Lectern\n\nNow about bookmarks.", lastModified: 2 },
    } as Record<string, MemoryFileInit>;
    delete changed["docs/api.html"];
    const second = countingFs(changed);
    const indexer = new Indexer(second.fs, "f", store);
    expect(await indexer.open()).toBe(3);
    // The stored index answers before any sync.
    expect((await indexer.search("handle")).map((r) => r.path)).toEqual(["docs/api.html"]);
    await indexer.sync(Object.keys(changed));
    expect(second.reads).toEqual(["README.md"]);
    expect((await indexer.search("bookmarks")).map((r) => r.path)).toEqual(["README.md"]);
    expect(await indexer.search("handle")).toEqual([]);
  });

  it("reports progress up to the total", async () => {
    const { fs } = countingFs(files);
    const progress: Array<[number, number]> = [];
    await new Indexer(fs, "f", new MemorySearchStore()).sync(Object.keys(files), (p) =>
      progress.push([p.done, p.total]),
    );
    expect(progress.at(-1)).toEqual([3, 3]);
  });
});
