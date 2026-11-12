# 0014. Bookmarks and notes, in the browser and in the document's DOM

- Status: accepted
- Date: 2026-11-09

## Context

Readers want to come back to documents and to write on what they read, without Lectern ever writing to the folder. Notes must survive edits to the document, and must work with a keyboard and a screen reader as well as with a mouse.

## Decision

- **Storage.** Two IndexedDB stores, local to the browser profile: `bookmarks` (one per document and folder) and `notes`. Forgetting a folder removes them. Both can be exported as JSON, because a browser profile can be lost.
- **Bookmarks** are per document, Markdown or HTML.
- **Notes are Markdown only** for now. A note quotes its text with some context on each side, and never stores offsets. It is found again by searching for the quote; the context chooses among several occurrences. Whitespace is ignored when matching, because the rendered page and the Markdown tree disagree on it, between blocks especially. Code blocks cannot be annotated: they render through their own component.
- **A note is written from the reader's selection or, with no selection, on the section being read.** The second path means no one needs to select text with a pointer.
- **Notes are real elements.** After sanitization, on a copy of the tree, the quoted text is wrapped in `<mark>` and followed by a numbered button that opens the note. The CSS Custom Highlight API was the other candidate. It leaves the DOM untouched, but its highlights are not exposed to assistive technology and cannot take focus.
- **Native `<dialog>`** for writing a note and for the list: focus trap, Escape and focus return come from the browser.
- **A note whose text is gone** is kept, reported above the document, and marked in the list.

## Consequences

- The document's DOM depends on its notes, so the tree is annotated again when a note changes or the document is re-read. This is one `structuredClone` and one walk per render, on documents of at most 2 MB.
- The selection is read from the DOM and the note is placed in the tree; the shared whitespace-free text keeps them aligned. Content that exists only in the DOM (the code block's copy button, note numbers) is left out when reading the selection.
- A note in a passage that was rewritten is reported, not relocated by fuzzy matching. Fuzzy matching can be added inside `locate` without changing what is stored.
