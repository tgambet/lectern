# Changelog

## 1.0.0 (2026-11-12)

First public release.

- Known folders: switch between the folders you opened, or forget one (its index, bookmarks and notes go with it).
- Live reload with `FileSystemObserver`: edits show up in the tree, the open document and the search index, keeping scroll position and focus; the window-focus re-read stays as a fallback.
- Bookmarks and notes: bookmark a document, annotate Markdown on a selection or on the current section, export both as JSON. Stored in the browser only.
- Reading preferences: file tree width and view, reading column width, zen mode (`Alt+Z`), `Ctrl+K` / `Cmd+K` to search.
- GitHub-style alerts, themed HTML documents (`lectern-doc.css`), more highlighted-code fixes.
- Accessibility pass against WCAG 2.2: focus management, announcements, reflow, keyboard shortcuts with a modifier, resizing without dragging, clearer current row and matches.
- Chrome and Edge 130 or later.

## 0.1.0 (2026-11-02)

First release.

- Open a local folder (read-only, File System Access API) and browse its Markdown and HTML documents in a keyboard-navigable tree; ignore rules and the root `.gitignore` honoured.
- Markdown: GFM (tables, task lists, footnotes, strikethrough, autolinks), frontmatter, heading anchors, table of contents, sanitized raw HTML, syntax highlighting for 40 languages with copy-to-clipboard.
- HTML documents in a sandboxed frame with relative resources served by the service worker; scripts off by default, opt-in per document in an opaque origin with in-memory storage.
- Links between documents, relative images and SVG, folder README/index landing pages, broken-link indication.
- Full-text search in a worker: incremental, persisted in IndexedDB, progressive results, highlighted snippets, `/` to focus.
- Resume the last folder in at most one click, with the last document and scroll position.
- Installable PWA, fully offline; light, dark and system themes; update prompt.
- Strict CSP with `connect-src 'none'` and Trusted Types; no network request after install.
- Built-in demo folder; unsupported-browser screen.
