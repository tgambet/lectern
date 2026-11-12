import { useCallback, useEffect, useState } from "preact/hooks";
import type { TextQuote } from "../marks/anchor.ts";
import type { BookmarkRecord, NoteRecord } from "../storage/db.ts";
import {
  deleteBookmark,
  deleteNote,
  listBookmarks,
  listNotes,
  putBookmark,
  putNote,
} from "../storage/marks.ts";

/** The open folder's bookmarks and notes, and what changes them. */
export function useMarks(folderId: string) {
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);

  const reload = useCallback(async () => {
    const [nextBookmarks, nextNotes] = await Promise.all([
      listBookmarks(folderId),
      listNotes(folderId),
    ]);
    setBookmarks(nextBookmarks);
    setNotes(nextNotes);
  }, [folderId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    bookmarks,
    notes,
    async addBookmark(path: string, title: string) {
      await putBookmark({ folderId, path, title, createdAt: Date.now() });
      await reload();
    },
    async removeBookmark(path: string) {
      await deleteBookmark(folderId, path);
      await reload();
    },
    async addNote(path: string, quote: TextQuote, text: string) {
      const now = Date.now();
      await putNote({
        id: crypto.randomUUID(),
        folderId,
        path,
        quote,
        text,
        createdAt: now,
        updatedAt: now,
      });
      await reload();
    },
    async editNote(note: NoteRecord, text: string) {
      await putNote({ ...note, text, updatedAt: Date.now() });
      await reload();
    },
    async removeNote(id: string) {
      await deleteNote(id);
      await reload();
    },
  };
}
