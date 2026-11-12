import type { BookmarkRecord, NoteRecord } from "../storage/db.ts";

/** The folder's bookmarks and notes as a JSON file: a browser profile can be lost. */
export function marksToJson(
  folder: string,
  bookmarks: BookmarkRecord[],
  notes: NoteRecord[],
  exportedAt: number,
): string {
  return JSON.stringify(
    {
      lectern: 1,
      folder,
      exportedAt: new Date(exportedAt).toISOString(),
      bookmarks: bookmarks.map(({ path, title, createdAt }) => ({
        path,
        title,
        createdAt: new Date(createdAt).toISOString(),
      })),
      notes: notes.map(({ path, quote, text, createdAt, updatedAt }) => ({
        path,
        quote: quote.exact,
        text,
        createdAt: new Date(createdAt).toISOString(),
        updatedAt: new Date(updatedAt).toISOString(),
      })),
    },
    null,
    2,
  );
}
