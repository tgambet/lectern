# 0001. Vite+ toolchain and a hand-written service worker

- Status: accepted
- Date: 2026-11-01

## Context

The stack fixes Vite+ (Vite 8 on Rolldown) and `vite-plugin-pwa`. The plugin's `generateSW` mode writes the whole service worker; Lectern needs its own fetch handler for the virtual file server (`/~/…`).

## Decision

- Scaffold with `vp create vite -- --template preact-ts` (Vite+ 1.4, Preact 11, TypeScript 7). `vite-plus` is a project-local dev dependency; contributors may use the global `vp` or `pnpm vp`.
- Use `vite-plugin-pwa` 2.0 in `injectManifest` mode with `src/sw/sw.ts`. Verified under Vite+ 1.4: the service worker builds through Rolldown and the precache manifest is injected. The plugin logs a Rolldown deprecation warning (`inlineDynamicImports`), harmless for now.
- Node 24.19.0 pinned in `.node-version`; pnpm 12.16.1 pinned through `devEngines.packageManager` (what Vite+ writes). No separate `packageManager` field: two pins for one thing drift.
- Playwright uses the installed Chrome locally (`channel: "chrome"`) and a downloaded Chromium in CI.

## Consequences

The service worker is ours to maintain, which milestone 2 needs anyway. If a future `vite-plugin-pwa` breaks under Rolldown, the fallback is Workbox's `injectManifest` CLI on the built output.
