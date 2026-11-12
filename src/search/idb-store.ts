import { openLecternDb } from "../storage/db.ts";
import type { SearchStore, StoredIndex } from "./store.ts";

export class IdbSearchStore implements SearchStore {
  async load(folderId: string): Promise<StoredIndex | null> {
    return (await (await openLecternDb()).get("searchIndex", folderId)) ?? null;
  }

  async save(folderId: string, stored: StoredIndex): Promise<void> {
    await (await openLecternDb()).put("searchIndex", stored, folderId);
  }

  async getText(folderId: string, path: string): Promise<string | null> {
    return (await (await openLecternDb()).get("searchText", [folderId, path]))?.text ?? null;
  }

  async putTexts(folderId: string, entries: Array<{ path: string; text: string }>): Promise<void> {
    const tx = (await openLecternDb()).transaction("searchText", "readwrite");
    await Promise.all([
      ...entries.map(({ path, text }) => tx.store.put({ folderId, path, text })),
      tx.done,
    ]);
  }

  async deleteTexts(folderId: string, paths: string[]): Promise<void> {
    const tx = (await openLecternDb()).transaction("searchText", "readwrite");
    await Promise.all([...paths.map((path) => tx.store.delete([folderId, path])), tx.done]);
  }
}
