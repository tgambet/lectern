# 0011. Known folders: close, switch, forget

- Status: accepted
- Date: 2026-11-02

## Context

Every folder ever opened is kept in IndexedDB with its handle, but the only way to change folder was the native picker.

## Decision

- **Home is a session state.** "Close folder" returns to `/` with the home screen: the card (open a folder, try the demo) and the list of known folders. With no known folder it is the first-run screen.
- **Switching never uses the picker.** The list (home, resume screen, and a disclosure menu on the folder name in the reader header) calls `requestPermission()` from the click, then opens the folder; if it is not granted, the resume screen shows for that folder. ADR 0007 still holds: one click at most.
- **Forget** removes the folder record (and its handle), search index and extracted text. The folder on disk is never touched. It is offered on home and resume only, not in the reader menu.
- The demo is never stored, so it is not in the list; it stays a button on home.
- On a fresh launch the last folder still opens or resumes as before; closing a folder is not persisted across reloads.

## Consequences

The list reads `listFolders()` on mount; no new schema. The menu is a disclosure button, not an ARIA menu, to keep keyboard behaviour simple.
