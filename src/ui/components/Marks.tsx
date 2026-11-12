import { createContext } from "preact";
import { useContext, useId, useState } from "preact/hooks";
import { readUrl } from "../../app/routes.ts";
import type { TextQuote } from "../../marks/anchor.ts";
import { marksToJson } from "../../marks/export.ts";
import type { BookmarkRecord, NoteRecord } from "../../storage/db.ts";
import { Dialog } from "./Dialog.tsx";
import { Icon } from "./Icon.tsx";

const noteElementId = (id: string) => `note-${id}`;

/** What the note buttons inside a rendered document need. */
export const NoteContext = createContext<{
  notes: ReadonlyMap<string, NoteRecord>;
  open: (id: string) => void;
}>({ notes: new Map(), open: () => {} });

/** The numbered button following a note's text; placed by `annotateTree`. */
export function NoteRef(props: { "data-note": string; "data-number": number | string }) {
  const { notes, open } = useContext(NoteContext);
  const id = props["data-note"];
  const text = notes.get(id)?.text ?? "";
  const label =
    text === "" ? `Note ${props["data-number"]}` : `Note ${props["data-number"]}: ${text}`;
  return (
    <button
      type="button"
      class="lc-note-ref"
      id={noteElementId(id)}
      aria-haspopup="dialog"
      aria-label={label}
      title={label}
      onClick={() => open(id)}
    >
      {props["data-number"]}
    </button>
  );
}

export function BookmarkButton(props: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      class="lc-btn lc-btn--ghost lc-btn--icon"
      aria-label="Bookmark this document"
      title={props.active ? "Remove the bookmark" : "Bookmark this document"}
      aria-pressed={props.active}
      onClick={props.onToggle}
    >
      <Icon name={props.active ? "bookmarked" : "bookmark"} />
    </button>
  );
}

export function AddNoteButton(props: { onAdd: () => void }) {
  return (
    <button
      type="button"
      class="lc-btn lc-btn--ghost lc-btn--icon"
      aria-label="Add a note on the selection, or on the current section"
      title="Add a note on the selection, or on the current section"
      aria-haspopup="dialog"
      // A pointer press must not clear the selection the note is about.
      onMouseDown={(event) => event.preventDefault()}
      onClick={props.onAdd}
    >
      <Icon name="note" />
    </button>
  );
}

export function MarksButton(props: { onOpen: () => void }) {
  return (
    <button
      type="button"
      class="lc-btn lc-btn--ghost lc-btn--icon"
      aria-label="Bookmarks and notes"
      title="Bookmarks and notes"
      aria-haspopup="dialog"
      onClick={props.onOpen}
    >
      <Icon name="list" />
    </button>
  );
}

export interface NoteDraft {
  /** The note being edited; absent for a new one. */
  note?: NoteRecord;
  quote: TextQuote;
}

/** Writes or edits a note. The field takes focus; focus returns to what opened it. */
export function NoteDialog(props: {
  draft: NoteDraft;
  onSave: (text: string) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { note, quote } = props.draft;
  const [text, setText] = useState(note?.text ?? "");
  const fieldId = useId();
  return (
    <Dialog title={note ? "Edit note" : "Add a note"} onClose={props.onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          props.onSave(text);
        }}
      >
        <p class="lc-label">About this text</p>
        <blockquote class="lc-dialog__quote">{quote.exact}</blockquote>
        <label class="lc-label lc-field-label" for={fieldId}>
          Note
        </label>
        <textarea
          class="lc-field"
          id={fieldId}
          rows={5}
          autofocus
          value={text}
          onInput={(event) => setText(event.currentTarget.value)}
        />
        <div class="lc-dialog__actions">
          <button type="submit" class="lc-btn lc-btn--primary">
            Save note
          </button>
          <button type="button" class="lc-btn" onClick={props.onClose}>
            Cancel
          </button>
          {note && (
            <button type="button" class="lc-btn lc-dialog__end" onClick={props.onDelete}>
              Delete note
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
}

function downloadMarks(folder: string, bookmarks: BookmarkRecord[], notes: NoteRecord[]) {
  const blob = new Blob([marksToJson(folder, bookmarks, notes, Date.now())], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${folder} notes.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Everything marked in this folder. Links go to the document, and to the note in it. */
export function MarksPanel(props: {
  folder: string;
  bookmarks: BookmarkRecord[];
  notes: NoteRecord[];
  /** Notes known to be gone from the document on screen. */
  missing: ReadonlySet<string>;
  /** Announced inside the dialog, since the page behind it is inert. */
  status: string;
  onRemoveBookmark: (bookmark: BookmarkRecord) => void;
  onRemoveNote: (note: NoteRecord) => void;
  onGoToNote: (id: string) => void;
  onClose: () => void;
}) {
  const { folder, bookmarks, notes } = props;
  const bookmarksId = useId();
  const notesId = useId();
  return (
    <Dialog title="Bookmarks and notes" lightDismiss onClose={props.onClose}>
      <section aria-labelledby={bookmarksId}>
        <h3 class="lc-label" id={bookmarksId}>
          Bookmarks
        </h3>
        {bookmarks.length === 0 ? (
          <p class="lc-marks__empty">No bookmarks in this folder.</p>
        ) : (
          <ul class="lc-marks">
            {bookmarks.map((bookmark) => (
              <li class="lc-marks__item" key={bookmark.path}>
                <div class="lc-marks__main">
                  <a href={readUrl(folder, bookmark.path)} onClick={props.onClose}>
                    {bookmark.title}
                  </a>
                  <code class="lc-marks__path">{bookmark.path}</code>
                </div>
                <button
                  type="button"
                  class="lc-btn lc-btn--ghost lc-btn--icon"
                  aria-label={`Remove bookmark: ${bookmark.title}`}
                  title="Remove bookmark"
                  onClick={() => props.onRemoveBookmark(bookmark)}
                >
                  <Icon name="close" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby={notesId}>
        <h3 class="lc-label" id={notesId}>
          Notes
        </h3>
        {notes.length === 0 ? (
          <p class="lc-marks__empty">No notes in this folder.</p>
        ) : (
          <ul class="lc-marks">
            {notes.map((note) => (
              <li class="lc-marks__item" key={note.id}>
                <div class="lc-marks__main">
                  <a
                    class="lc-marks__quote"
                    href={readUrl(folder, note.path, noteElementId(note.id))}
                    onClick={() => {
                      props.onClose();
                      props.onGoToNote(note.id);
                    }}
                  >
                    {note.quote.exact}
                  </a>
                  {note.text !== "" && <p class="lc-marks__text">{note.text}</p>}
                  <code class="lc-marks__path">{note.path}</code>
                  {props.missing.has(note.id) && (
                    <p class="lc-marks__gone">This text is no longer in the document.</p>
                  )}
                </div>
                <button
                  type="button"
                  class="lc-btn lc-btn--ghost lc-btn--icon"
                  aria-label={`Delete note on: ${note.quote.exact}`}
                  title="Delete note"
                  onClick={() => props.onRemoveNote(note)}
                >
                  <Icon name="close" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div class="lc-dialog__actions">
        <button
          type="button"
          class="lc-btn"
          disabled={bookmarks.length === 0 && notes.length === 0}
          onClick={() => downloadMarks(folder, bookmarks, notes)}
        >
          Export as JSON
        </button>
      </div>
      <p class="lc-sr-only" role="status">
        {props.status}
      </p>
    </Dialog>
  );
}
