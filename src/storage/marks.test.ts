import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vite-plus/test";
import type { StoredRoot } from "../fs/file-system-access-fs.ts";
import { DB_NAME, closeLecternDb, deleteFolder, putFolder, type NoteRecord } from "./db.ts";
import {
  deleteBookmark,
  deleteNote,
  listBookmarks,
  listNotes,
  putBookmark,
  putNote,
} from "./marks.ts";

const note = (id: string, folderId: string, path: string, createdAt: number): NoteRecord => ({
  id,
  folderId,
  path,
  quote: { exact: "x", prefix: "", suffix: "" },
  text: "",
  createdAt,
  updatedAt: createdAt,
});

afterEach(async () => {
  await closeLecternDb();
  indexedDB.deleteDatabase(DB_NAME);
});

describe("bookmarks", () => {
  it("keeps one bookmark per document, per folder, newest first", async () => {
    await putBookmark({ folderId: "f", path: "a.md", title: "A", createdAt: 1 });
    await putBookmark({ folderId: "f", path: "b.md", title: "B", createdAt: 2 });
    await putBookmark({ folderId: "f", path: "a.md", title: "A again", createdAt: 3 });
    await putBookmark({ folderId: "g", path: "a.md", title: "Other", createdAt: 4 });
    expect((await listBookmarks("f")).map((b) => b.title)).toEqual(["A again", "B"]);
  });

  it("removes a bookmark", async () => {
    await putBookmark({ folderId: "f", path: "a.md", title: "A", createdAt: 1 });
    await deleteBookmark("f", "a.md");
    expect(await listBookmarks("f")).toEqual([]);
  });
});

describe("notes", () => {
  it("lists a folder's notes by document, then by date", async () => {
    await putNote(note("3", "f", "b.md", 1));
    await putNote(note("2", "f", "a.md", 2));
    await putNote(note("1", "f", "a.md", 1));
    await putNote(note("4", "g", "a.md", 1));
    expect((await listNotes("f")).map((n) => n.id)).toEqual(["1", "2", "3"]);
  });

  it("removes a note", async () => {
    await putNote(note("1", "f", "a.md", 1));
    await deleteNote("1");
    expect(await listNotes("f")).toEqual([]);
  });
});

describe("forgetting a folder", () => {
  it("removes its bookmarks and notes, and no others", async () => {
    await putFolder({
      id: "f",
      name: "f",
      root: {} as StoredRoot,
      addedAt: 0,
      openedAt: 0,
      docCount: null,
      lastFile: null,
      lastScroll: 0,
    });
    await putBookmark({ folderId: "f", path: "a.md", title: "A", createdAt: 1 });
    await putBookmark({ folderId: "g", path: "a.md", title: "A", createdAt: 1 });
    await putNote(note("1", "f", "a.md", 1));
    await putNote(note("2", "g", "a.md", 1));
    await deleteFolder("f");
    expect(await listBookmarks("f")).toEqual([]);
    expect(await listNotes("f")).toEqual([]);
    expect(await listBookmarks("g")).toHaveLength(1);
    expect(await listNotes("g")).toHaveLength(1);
  });
});
