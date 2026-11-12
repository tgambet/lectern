/** Bookmarks and notes (ADR 0014). In this browser profile only, never in the folder. */
import { openLecternDb, type BookmarkRecord, type NoteRecord } from "./db.ts";

export async function listBookmarks(folderId: string): Promise<BookmarkRecord[]> {
  const all = await (await openLecternDb()).getAllFromIndex("bookmarks", "folderId", folderId);
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function putBookmark(bookmark: BookmarkRecord): Promise<void> {
  await (await openLecternDb()).put("bookmarks", bookmark);
}

export async function deleteBookmark(folderId: string, path: string): Promise<void> {
  await (await openLecternDb()).delete("bookmarks", [folderId, path]);
}

export async function listNotes(folderId: string): Promise<NoteRecord[]> {
  const all = await (await openLecternDb()).getAllFromIndex("notes", "folderId", folderId);
  return all.sort((a, b) => a.path.localeCompare(b.path) || a.createdAt - b.createdAt);
}

export async function putNote(note: NoteRecord): Promise<void> {
  await (await openLecternDb()).put("notes", note);
}

export async function deleteNote(id: string): Promise<void> {
  await (await openLecternDb()).delete("notes", id);
}
