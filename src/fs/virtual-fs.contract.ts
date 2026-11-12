/**
 * Behaviour every VirtualFS must share. Each implementation's test file calls
 * `describeVirtualFS` with a factory that builds `contractFixture`.
 */
import { describe, expect, it } from "vite-plus/test";
import { isFsError, type FsErrorCode } from "./errors.ts";
import type { VirtualFS } from "./virtual-fs.ts";

export const contractFixture = {
  name: "docs",
  files: {
    "README.md": "# Hello\n",
    "guide/setup.md": "Setup, accented: é",
    "guide/deep/notes.txt": "",
    "img/logo.png": new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
  },
  lastModified: 1_700_000_000_000,
} as const;

async function rejectsWith(promise: Promise<unknown>, code: FsErrorCode): Promise<void> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(isFsError(error, code), `expected FsError ${code}, got ${String(error)}`).toBe(true);
}

export function describeVirtualFS(label: string, create: () => Promise<VirtualFS>): void {
  describe(`VirtualFS contract: ${label}`, () => {
    it("exposes the root folder name", async () => {
      expect((await create()).name).toBe("docs");
    });

    it("lists direct children with root-relative paths", async () => {
      const fs = await create();
      const sort = <T extends { path: string }>(xs: T[]) =>
        [...xs].sort((a, b) => (a.path < b.path ? -1 : 1));
      expect(sort(await fs.list(""))).toEqual([
        { kind: "file", name: "README.md", path: "README.md" },
        { kind: "directory", name: "guide", path: "guide" },
        { kind: "directory", name: "img", path: "img" },
      ]);
      expect(sort(await fs.list("guide"))).toEqual([
        { kind: "directory", name: "deep", path: "guide/deep" },
        { kind: "file", name: "setup.md", path: "guide/setup.md" },
      ]);
    });

    it("normalizes the paths it is given", async () => {
      const fs = await create();
      expect((await fs.list("./guide/")).length).toBe(2);
      expect(await fs.readText("guide/deep/../setup.md")).toBe("Setup, accented: é");
    });

    it("stats files and directories", async () => {
      const fs = await create();
      expect(await fs.stat("README.md")).toEqual({
        kind: "file",
        name: "README.md",
        path: "README.md",
        size: 8,
        lastModified: contractFixture.lastModified,
      });
      expect(await fs.stat("guide")).toMatchObject({ kind: "directory", size: 0 });
      expect(await fs.stat("")).toMatchObject({ kind: "directory", name: "docs", path: "" });
    });

    it("reads text as UTF-8 and binaries as blobs", async () => {
      const fs = await create();
      expect(await fs.readText("guide/deep/notes.txt")).toBe("");
      const blob = await fs.readBlob("img/logo.png");
      expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    });

    it("fails with typed errors", async () => {
      const fs = await create();
      await rejectsWith(fs.readText("missing.md"), "not-found");
      await rejectsWith(fs.stat("guide/missing"), "not-found");
      await rejectsWith(fs.readText("guide"), "not-a-file");
      await rejectsWith(fs.list("README.md"), "not-a-directory");
      await rejectsWith(fs.readText("../outside.md"), "invalid-path");
    });
  });
}
