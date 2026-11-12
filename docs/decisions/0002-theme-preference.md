# 0002. Theme preference in localStorage, applied before first paint

- Status: accepted
- Date: 2026-11-01

## Context

Themes are `auto`, `light` or `dark`; `auto` follows `prefers-color-scheme`. `design/tokens.css` defines light on `:root` and dark on `[data-theme="dark"]`, with no media query. The CSP forbids inline scripts, and IndexedDB is asynchronous, so a theme read from IndexedDB would flash.

## Decision

- Store the preference in `localStorage` (`lectern.theme`). It is a per-device convenience, not app data.
- `public/theme-boot.js`, a same-origin classic script in `<head>`, resolves the preference and sets `<html data-theme>` before first paint. `src/app/theme.ts` keeps it in sync with the toggle and with system changes.
- `data-theme` is always set, so `design/tokens.css` stays unchanged: no generated `prefers-color-scheme` block is needed.

## Consequences

One tiny script outside the bundle. Every other persisted state (folder, last file, scroll, ignore rules) goes to IndexedDB.
