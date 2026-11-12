/**
 * IndexedDB schema, shared by the app, the search worker and the service
 * worker. Holds opened folders (with their handle, opaque here), preferences,
 * the search index with the extracted text of documents, bookmarks and notes.
 * Local to this browser profile; nothing is ever written to the folder.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { StoredRoot } from "../fs/file-system-access-fs.ts";
import type { TextQuote } from "../marks/anchor.ts";
import type { StoredIndex } from "../search/store.ts";

export interface FolderRecord {
  /** Random id, used in `/~/<id>/…` URLs. Never the folder name. */
  id: string;
  name: string;
  root: StoredRoot;
  addedAt: number;
  openedAt: number;
  docCount: number | null;
  lastFile: string | null;
  lastScroll: number;
}

export interface SearchTextRecord {
  folderId: string;
  path: string;
  text: string;
}

export interface BookmarkRecord {
  folderId: string;
  path: string;
  /** The document's title when it was bookmarked. */
  title: string;
  createdAt: number;
}

export interface NoteRecord {
  id: string;
  folderId: string;
  path: string;
  quote: TextQuote;
  /** May be empty: a highlight with nothing written on it. */
  text: string;
  createdAt: number;
  updatedAt: number;
}

interface LecternSchema extends DBSchema {
  folders: { key: string; value: FolderRecord; indexes: { openedAt: number } };
  prefs: { key: string; value: unknown };
  /** Serialized search index per folder (key: folder id). */
  searchIndex: { key: string; value: StoredIndex };
  /** Extracted body text per document, for snippets. */
  searchText: { key: [string, string]; value: SearchTextRecord; indexes: { folderId: string } };
  bookmarks: { key: [string, string]; value: BookmarkRecord; indexes: { folderId: string } };
  notes: { key: string; value: NoteRecord; indexes: { folderId: string } };
}

export type LecternDb = IDBPDatabase<LecternSchema>;

export const DB_NAME = "lectern";

let db: Promise<LecternDb> | null = null;

export function openLecternDb(): Promise<LecternDb> {
  db ??= openDB<LecternSchema>(DB_NAME, 3, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        const folders = database.createObjectStore("folders", { keyPath: "id" });
        folders.createIndex("openedAt", "openedAt");
        database.createObjectStore("prefs");
      }
      if (oldVersion < 2) {
        database.createObjectStore("searchIndex");
        const texts = database.createObjectStore("searchText", { keyPath: ["folderId", "path"] });
        texts.createIndex("folderId", "folderId");
      }
      if (oldVersion < 3) {
        database
          .createObjectStore("bookmarks", { keyPath: ["folderId", "path"] })
          .createIndex("folderId", "folderId");
        database.createObjectStore("notes", { keyPath: "id" }).createIndex("folderId", "folderId");
      }
    },
    // A newer app version wants to upgrade: let it, and reopen on next use.
    blocking(_current, _blocked, event) {
      (event.target as IDBDatabase).close();
      db = null;
    },
  });
  return db;
}

/** For tests: forget the cached connection. */
export async function closeLecternDb(): Promise<void> {
  if (db) (await db).close();
  db = null;
}

export async function getFolder(id: string): Promise<FolderRecord | undefined> {
  return (await openLecternDb()).get("folders", id);
}

export async function listFolders(): Promise<FolderRecord[]> {
  return (await (await openLecternDb()).getAllFromIndex("folders", "openedAt")).reverse();
}

export async function putFolder(record: FolderRecord): Promise<void> {
  await (await openLecternDb()).put("folders", record);
}

export async function updateFolder(
  id: string,
  patch: Partial<Omit<FolderRecord, "id" | "root">>,
): Promise<void> {
  const database = await openLecternDb();
  const tx = database.transaction("folders", "readwrite");
  const current = await tx.store.get(id);
  if (current) await tx.store.put({ ...current, ...patch });
  await tx.done;
}

/**
 * Forget a folder: its record (and handle), search index, extracted text,
 * bookmarks and notes. Only Lectern's own storage is touched, never the folder on disk.
 */
export async function deleteFolder(id: string): Promise<void> {
  const database = await openLecternDb();
  const tx = database.transaction(
    ["folders", "searchIndex", "searchText", "bookmarks", "notes"],
    "readwrite",
  );
  await Promise.all([
    tx.objectStore("folders").delete(id),
    tx.objectStore("searchIndex").delete(id),
    tx
      .objectStore("searchText")
      .index("folderId")
      .getAllKeys(id)
      .then((keys) => Promise.all(keys.map((key) => tx.objectStore("searchText").delete(key)))),
    tx
      .objectStore("bookmarks")
      .index("folderId")
      .getAllKeys(id)
      .then((keys) => Promise.all(keys.map((key) => tx.objectStore("bookmarks").delete(key)))),
    tx
      .objectStore("notes")
      .index("folderId")
      .getAllKeys(id)
      .then((keys) => Promise.all(keys.map((key) => tx.objectStore("notes").delete(key)))),
  ]);
  await tx.done;
}

export async function getPref<T>(key: string): Promise<T | undefined> {
  return (await (await openLecternDb()).get("prefs", key)) as T | undefined;
}

export async function setPref(key: string, value: unknown): Promise<void> {
  await (await openLecternDb()).put("prefs", value, key);
}
