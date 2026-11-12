# Architecture

Lectern is a static single-page app plus a service worker. There is no server: everything runs in the browser, on the reader's device.

## Layout

| Path                           | Role                                                                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `config/`                      | Build-time settings: supported browsers (`targets.ts`), favicon and PWA icon files (`brand.ts`), Vite plugins (CSP, brand icons, theme color). |
| `design/`                      | The design system: tokens, fonts, reference component CSS, logos, mockups. Source of truth for the UI.                                         |
| `src/platform/capabilities.ts` | Every browser feature check.                                                                                                                   |
| `src/fs/`                      | `VirtualFS` interface, `MemoryFS`, `FileSystemAccessFS`, path utilities.                                                                       |
| `src/app/`                     | App state (Preact signals), theme.                                                                                                             |
| `src/ui/`                      | Preact components (thin ports of `lc-*`) and screens.                                                                                          |
| `src/sw/`                      | Service worker: precache, navigation fallback; later the virtual file server.                                                                  |
| `tests/e2e/`                   | Playwright tests against the production build.                                                                                                 |

## Filesystem

The app reads folders only through `VirtualFS` (`list`, `stat`, `readText`, `readBlob`). Paths are root-relative and `/`-separated; `resolvePath` resolves links the same way for every implementation. `MemoryFS` backs unit tests and fixtures; `FileSystemAccessFS` wraps a `FileSystemDirectoryHandle` and is the only module that touches handles. A shared contract suite (`virtual-fs.contract.ts`) keeps implementations aligned.

## Shell and offline

`vite-plugin-pwa` runs in `injectManifest` mode: `src/sw/sw.ts` is ours, Workbox injects the precache list (JS, CSS, fonts, icons). Navigations fall back to the cached shell, except `/~/…`, reserved for the virtual file server.

## Theme

`public/theme-boot.js` sets `<html data-theme>` before first paint from the stored preference (`auto`, `light`, `dark`); `src/app/theme.ts` keeps it in sync afterwards. See ADR 0002.

## Opening and resuming a folder

The picked `FileSystemDirectoryHandle` is stored in IndexedDB with a random folder id. On launch, if its permission is still granted, the folder opens directly; otherwise the resume card asks for it in one click (ADR 0007). The installed app tries a silent re-grant first.

## Reading

1. The folder is walked into a file index (ignore rules: tooling folders, hidden entries, the root `.gitignore`). The tree shows documents only.
2. The route `/read/<folder>/<path>#anchor` picks a document; a folder resolves to its README or index.
3. Markdown is read, rendered by the pipeline, highlighted, and rendered as Preact elements. Relative images and files load from `/~/<folderId>/…`, answered by the service worker through the stored handle.
4. HTML documents open in a sandboxed iframe on `/~/<folderId>/<path>` (ADR 0005). Scripts are off; when a document has some, a notice offers to run them in an opaque origin, with resources inlined by the service worker.
5. The last document and scroll position are saved per folder.
6. A search worker indexes the folder's documents in the background (only changed files are re-read) and answers the header search box.
7. Bookmarks and notes live in IndexedDB. Notes are found again by their quoted text and marked in a copy of the sanitized tree, as `<mark>` plus a numbered button (ADR 0014).

## Offline and updates

Everything the app needs is precached (code, the 40 grammars, fonts, icons). A new version waits until the reader accepts the "A new version of Lectern is ready" toast. Storage persistence is requested once a folder opens (ADR 0010).

## Performance

Measured on a generated 5,000-file repository (3,001 documents): the shell is about 34 kB of gzipped JS; the Markdown pipeline, Shiki and the search worker load on demand. The index builds in about 7 s off the main thread, searchable while it runs, with no long task on the main thread (`tests/e2e/large.spec.ts`).

## Still to come

See the [roadmap](roadmap.md).
