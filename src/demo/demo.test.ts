import { describe, expect, it } from "vite-plus/test";
import { buildFileIndex } from "../tree/file-index.ts";
import { countDocuments } from "../tree/documents.ts";
import { createIgnoreRule } from "../tree/ignore.ts";
import { DEMO_NAME, loadDemo } from "./demo.ts";

describe("demo folder", () => {
  it("bundles a small documentation folder", async () => {
    const fs = await loadDemo();
    expect(fs.name).toBe(DEMO_NAME);
    const index = await buildFileIndex(fs, { ignore: createIgnoreRule() });
    expect(countDocuments(index)).toBe(6);
    expect(index.files.has("assets/how-it-works.svg")).toBe(true);
    expect(await fs.readText("README.md")).toContain("# Welcome to Lectern");
  });
});
