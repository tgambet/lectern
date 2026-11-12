# 0006. Virtual file server in the service worker

- Status: accepted (spike, milestone 2); permission behaviour with a picked folder pending spike 3
- Date: 2026-11-01

## Context

HTML documents and their sub-resources are requested as URLs. Something must answer `/~/<rootId>/<path>` by reading the folder. The candidates: the SW reads the stored directory handle itself, or it asks an app window to read the file for it.

## What the spike showed

- `FileSystemHandle`, `FileSystemDirectoryHandle` and `queryPermission` exist in the service worker scope (Chrome 156).
- With a handle stored in IndexedDB (an OPFS directory in the automated run), the SW reads files directly in 1 to 4 ms each.
- Relaying the read through the app window (`postMessage` with a `MessageChannel`, answer as a `Blob`) works too, in 2 to 6 ms.
- Whether the SW sees `granted` for a folder picked by the user, when the page has the permission, needs a real picker: this is part of spike 3's manual checklist.

## Decision

- URL scheme `/~/<rootId>/<path>`. `rootId` is a random id assigned when a folder is stored, never its name. The SW resolves it from the IndexedDB handle store.
- The SW reads directly through the handle; if that fails (no handle, permission not granted in the SW), it relays to a window client. If no window can read the file either, it answers 404.
- Responses: `Content-Type` from the extension (a small table shared with the app), `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and, for documents, the CSP of ADR 0005.
- The SW code reads through the same `VirtualFS` implementation as the app (`FileSystemAccessFS`), so path rules and errors stay identical.

## Consequences

The SW bundle gains the filesystem module and an IndexedDB reader. The relay keeps HTML rendering working even if a browser version stops exposing handles to the SW.
