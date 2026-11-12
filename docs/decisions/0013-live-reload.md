# 0013. Live reload with FileSystemObserver, focus re-read as fallback

- Status: accepted
- Date: 2026-11-02

## Context

The reader re-read the folder when the window regained focus, at most every 30 seconds, so an edit made in an editor showed up late, and every re-read sent the reader back to the top of the document. Chromium ships `FileSystemObserver` (checked in a spike: recursive observation of a directory handle works, OPFS included, with root-relative paths in each record).

## Decision

- **`VirtualFS.watch`** (optional) reports changes as `{ type: added | removed | modified | unknown, path }` until stopped. `FileSystemAccessFS` implements it with `FileSystemObserver` when `capabilities.hasFileSystemObserver`; `moved` becomes removed + added, `unknown` and `errored` mean "anything may have changed". `MemoryFS` (demo, tests) does not watch.
- **The reader filters, then re-reads.** Changes under ignored paths (`.git`, `node_modules`, `.gitignore` matches) are dropped, except the root `.gitignore` itself (`src/tree/changes.ts`). After 250 ms of quiet the file index is rebuilt; the open document is read again and the search index re-syncs, which only re-reads documents whose size or date changed (ADR 0009).
- **The reader keeps its place.** The same document read again keeps its scroll position and focus; only navigation scrolls.
- **HTML documents** reload their frame when a changed path is next to or below them (their CSS, scripts, images), since the frame's resources are not tracked one by one.
- **Fallback:** where the folder cannot be watched, the focus re-read stays as before, without reloading HTML frames.

## Consequences

- Rebuilding the whole file index on each burst is simple and fast enough for documentation folders (the 5,000-file test builds its tree in well under a second). A per-path update of the index is possible later if needed.
- A git checkout produces one burst of changes and one re-read.
