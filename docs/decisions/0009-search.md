# 0009. Full-text search in a worker, incremental, persisted in IndexedDB

- Status: accepted
- Date: 2026-11-02

## Context

Search must cover titles and contents of every document, show snippets with matches, stay responsive on repositories with thousands of files, and give first results while indexing runs.

## Decision

- **MiniSearch** (MIT, small, field boosts, prefix and fuzzy search, JSON serialization). FlexSearch is faster on huge corpora but has no stable serialization of the same simplicity; documentation folders stay in MiniSearch's comfort zone.
- **Fields**: title (frontmatter title, first h1, `<title>`, else file name), path, headings, body; boosts 3 / 2 / 2 / 1. The path field (split on `/`, `.`, `-`, `_` by the default tokenizer) lets the header search find documents by file or folder name; terms matched there are marked in the result's path. Added in index version 3, which rebuilds stored indexes once. Prefix matching for terms of 2+ characters, fuzzy (0.2) for 5+, all terms required.
- **Extraction** (`src/search/extract.ts`): Markdown through remark (no HTML rendering), HTML through `hast-util-from-html`; scripts, styles and templates are excluded. Body text is capped at 200,000 characters per document.
- **Worker** (`src/search/worker.ts`): owns the index, reads documents through the stored folder handle, and answers queries between reads, so results appear while indexing. The app sends it the document list from its file index (same ignore rules), never file contents.
- **Incremental**: per document, size and `lastModified` are stored; a sync reads only new or changed documents and drops removed ones. The serialized index is saved every 200 documents and at the end; on the next launch it loads before any sync, so search works immediately.
- **Storage**: IndexedDB `searchIndex` (one serialized index per folder) and `searchText` (body text per document, for snippets). `INDEX_VERSION` invalidates stored indexes when fields or tokenization change.
- **Snippets** are built in the worker as plain text parts flagged as matches; the UI wraps matches in `<mark>` without any HTML parsing.
- **UI**: the header search box is an ARIA combobox (Ctrl/Cmd+K to focus, arrows, Enter, Esc; a modifier, for WCAG 2.1.4), with a status line while indexing.

## Consequences

- The extracted text of documents is stored in the browser profile (IndexedDB), on this device only. Forgetting a folder must also drop its index.
- The worker bundle is large (about 140 kB gzipped: remark, the HTML parser and MiniSearch) but loads only when a folder opens, off the main thread.
- Bundling note: `decode-named-character-reference` (used by micromark) picks a DOM implementation under the `browser` condition; worker bundles are redirected to its `worker` export (`workerConditions` in `config/vite-plugins.ts`).
