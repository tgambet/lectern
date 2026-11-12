# 0012. Reading preferences: per device, in localStorage; zen is not kept

- Status: accepted
- Date: 2026-11-02

## Context

The reader gained preferences: the file tree's width, its view (nested, compact folders, flat) and the reading column's width (normal `measure`, wide `measure-wide`, full). IndexedDB was suggested for them. The reader also gained a zen mode showing the document alone.

## Decision

- **localStorage, like the theme** (ADR 0002), in `src/app/preferences.ts`: one key per preference (`lectern.sidebar`, `lectern.tree-view`, `lectern.reading-width`), read synchronously at startup so the first render already has the right layout, with no flash and no async state. Values are tiny and per device; IndexedDB stays for folders and search data.
- **Per device, not per folder.** These are about the screen and the reader's habits, not the content.
- Unknown or malformed stored values fall back to the default; blocked storage keeps the choice for the session.
- **Zen is not kept.** A new visit starts with the tree and header, so nobody lands in an app with no visible way around. Alt+Z toggles it (a modifier, for WCAG 2.1.4), Escape and a quiet close button leave it.
- Full width keeps the table of contents: width is about the column, zen is about hiding chrome.

## Consequences

- Clearing site data resets the preferences with everything else.
- If preferences ever need to sync between the app's windows live, a `storage` event listener can be added to the same module.
