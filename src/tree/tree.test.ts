import { describe, expect, it } from "vite-plus/test";
import { MemoryFS } from "../fs/memory-fs.ts";
import { countDocuments, documentKind, landingFor } from "./documents.ts";
import { buildFileIndex, lookup } from "./file-index.ts";
import { createIgnoreRule } from "./ignore.ts";
import {
  ancestorsOf,
  buildDocumentTree,
  compactTree,
  directoryPaths,
  filterTree,
  flatRows,
  parseTreeView,
  visibleRows,
  type TreeNode,
} from "./tree.ts";

const fs = new MemoryFS("repo", {
  "README.md": "",
  "src/main.ts": "",
  "docs/guide 10.md": "",
  "docs/guide 2.md": "",
  "docs/img/a.png": "",
  "docs/api/index.html": "",
  "docs/Readme.MD": "",
  ".github/CONTRIBUTING.md": "",
  "node_modules/pkg/README.md": "",
  "generated/out.md": "",
  "notes.log": "",
});

describe("file index", () => {
  it("applies default ignores, hidden entries and the root .gitignore", async () => {
    const index = await buildFileIndex(fs, {
      ignore: createIgnoreRule({ gitignore: "generated/\n*.log\n" }),
    });
    expect([...index.files].sort()).toEqual([
      "README.md",
      "docs/Readme.MD",
      "docs/api/index.html",
      "docs/guide 10.md",
      "docs/guide 2.md",
      "docs/img/a.png",
      "src/main.ts",
    ]);
    expect(lookup(index, "docs/img")).toBe("directory");
    expect(lookup(index, "docs/img/a.png")).toBe("file");
    expect(lookup(index, "node_modules")).toBeNull();
    expect(countDocuments(index)).toBe(5);
  });

  it("reports progress and can be cancelled", async () => {
    const progress: number[] = [];
    await buildFileIndex(fs, { ignore: createIgnoreRule(), onProgress: (n) => progress.push(n) });
    expect(progress.length).toBeGreaterThan(1);
    const controller = new AbortController();
    controller.abort();
    await expect(
      buildFileIndex(fs, { ignore: createIgnoreRule(), signal: controller.signal }),
    ).rejects.toThrow();
  });
});

describe("document tree", () => {
  it("keeps documents only, folders first, in natural order", async () => {
    const index = await buildFileIndex(fs, { ignore: createIgnoreRule() });
    const tree = buildDocumentTree(index, "repo");
    const rows = visibleRows(tree, new Set(["docs"]));
    expect(rows.map((r) => `${"  ".repeat(r.depth)}${r.node.name}`)).toEqual([
      "docs",
      "  api",
      "  guide 2.md",
      "  guide 10.md",
      "  Readme.MD",
      "generated",
      "README.md",
    ]);
  });

  it("lists ancestors outermost first", () => {
    expect(ancestorsOf("a/b/c.md")).toEqual(["a", "a/b"]);
    expect(ancestorsOf("c.md")).toEqual([]);
  });
});

describe("tree views", () => {
  const deep = new MemoryFS("repo", {
    "README.md": "",
    "design/assets/Logo/README.md": "",
    "design/assets/Logo/usage.md": "",
    "design/README.md": "",
    "docs/decisions/0001-toolchain.md": "",
  });
  const load = async (): Promise<TreeNode> =>
    buildDocumentTree(await buildFileIndex(deep, { ignore: createIgnoreRule() }), "repo");
  const outline = (rows: ReturnType<typeof visibleRows>) =>
    rows.map((r) => `${"  ".repeat(r.depth)}${r.node.name}`);

  it("merges single-folder chains in compact view", async () => {
    const tree = compactTree(await load());
    const rows = visibleRows(tree, new Set(directoryPaths(tree)));
    expect(outline(rows)).toEqual([
      "design",
      "  assets/Logo",
      "    README.md",
      "    usage.md",
      "  README.md",
      "docs/decisions",
      "  0001-toolchain.md",
      "README.md",
    ]);
    const logo = rows.find((r) => r.node.name === "assets/Logo")!;
    expect(logo.node.path).toBe("design/assets/Logo");
    expect(logo.parent).toBe("design");
    expect(rows.find((r) => r.node.name === "usage.md")!.parent).toBe("design/assets/Logo");
  });

  it("lists full paths in flat view", async () => {
    expect(flatRows(await load()).map((r) => r.node.name)).toEqual([
      "design/assets/Logo/README.md",
      "design/assets/Logo/usage.md",
      "design/README.md",
      "docs/decisions/0001-toolchain.md",
      "README.md",
    ]);
  });

  it("filters on the path, any case, keeping the folders on the way", async () => {
    const tree = filterTree(await load(), " logo ");
    expect(outline(visibleRows(tree, new Set(directoryPaths(tree))))).toEqual([
      "design",
      "  assets",
      "    Logo",
      "      README.md",
      "      usage.md",
    ]);
    expect(filterTree(await load(), "nothing").children).toEqual([]);
    const all = await load();
    expect(filterTree(all, "  ")).toBe(all);
  });

  it("falls back to the nested view on unknown stored values", () => {
    expect(parseTreeView(null)).toBe("tree");
    expect(parseTreeView("flat")).toBe("flat");
    expect(parseTreeView("grid")).toBe("tree");
  });
});

describe("documents", () => {
  it("recognizes Markdown and HTML", () => {
    expect(documentKind("a/B.MD")).toBe("markdown");
    expect(documentKind("a/index.htm")).toBe("html");
    expect(documentKind("a/main.ts")).toBeNull();
  });

  it("finds a folder's landing document, README first", async () => {
    const index = await buildFileIndex(fs, { ignore: createIgnoreRule() });
    expect(landingFor(index, "docs")).toBe("docs/Readme.MD");
    expect(landingFor(index, "docs/api")).toBe("docs/api/index.html");
    expect(landingFor(index, "docs/img")).toBeNull();
    expect(landingFor(index, "")).toBe("README.md");
  });
});
