import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vite-plus/test";
import type { StoredRoot } from "../fs/file-system-access-fs.ts";
import {
  DB_NAME,
  closeLecternDb,
  deleteFolder,
  openLecternDb,
  getFolder,
  getPref,
  listFolders,
  putFolder,
  setPref,
  updateFolder,
  type FolderRecord,
} from "./db.ts";

const folder = (id: string, openedAt: number): FolderRecord => ({
  id,
  name: id,
  root: { fake: id } as unknown as StoredRoot,
  addedAt: 0,
  openedAt,
  docCount: null,
  lastFile: null,
  lastScroll: 0,
});

afterEach(async () => {
  await closeLecternDb();
  indexedDB.deleteDatabase(DB_NAME);
});

describe("storage", () => {
  it("lists folders most recently opened first", async () => {
    await putFolder(folder("a", 1));
    await putFolder(folder("b", 3));
    await putFolder(folder("c", 2));
    expect((await listFolders()).map((f) => f.id)).toEqual(["b", "c", "a"]);
  });

  it("patches a folder without touching its handle", async () => {
    await putFolder(folder("a", 1));
    await updateFolder("a", { lastFile: "docs/x.md", lastScroll: 120 });
    expect(await getFolder("a")).toMatchObject({
      lastFile: "docs/x.md",
      lastScroll: 120,
      root: { fake: "a" },
    });
  });

  it("ignores patches to unknown folders", async () => {
    await updateFolder("nope", { lastScroll: 1 });
    expect(await getFolder("nope")).toBeUndefined();
  });

  it("forgets a folder with its search data, and only that folder", async () => {
    await putFolder(folder("a", 1));
    await putFolder(folder("b", 2));
    const db = await openLecternDb();
    await db.put("searchText", { folderId: "a", path: "x.md", text: "x" });
    await db.put("searchText", { folderId: "b", path: "y.md", text: "y" });
    await deleteFolder("a");
    expect((await listFolders()).map((f) => f.id)).toEqual(["b"]);
    expect(await db.getAllFromIndex("searchText", "folderId", "a")).toEqual([]);
    expect(await db.getAllFromIndex("searchText", "folderId", "b")).toHaveLength(1);
  });

  it("stores preferences", async () => {
    await setPref("ignore", ["dist"]);
    expect(await getPref<string[]>("ignore")).toEqual(["dist"]);
  });
});
