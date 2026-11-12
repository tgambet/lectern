# Lectern

Installable, offline-first PWA that opens a local folder (File System Access API) and renders its Markdown/HTML documentation. Read-only, 100 % local, no server, no telemetry. MIT licensed.

## Hard rules

- Read-only: never request `readwrite`, never write to the user's folder.
- No network at runtime after install. No CDN, remote fonts or analytics. Strict CSP. A test guards this.
- Feature detection only (`src/platform/capabilities.ts`), never user-agent sniffing. No Modernizr unless justified.
- Repo content is untrusted: Markdown output goes through `rehype-sanitize`; HTML docs render in a sandboxed iframe, scripts off by default.
- All file access goes through the `VirtualFS` interface, never raw handles outside `FileSystemAccessFS`.
- Chrome/Edge only for now. Degraded mode is post-MVP.

## Stack

TypeScript (strict), Vite+ (`vp` CLI: Vite, Rolldown, Vitest, Oxlint, Oxfmt), vite-plugin-pwa, Preact + signals, unified (remark/rehype), Shiki, MiniSearch + IndexedDB (`idb`), Playwright for e2e.

## Commands

`vp dev`, `vp build`, `vp test`, `vp check` (format + lint + type-check, `--fix` to auto-fix), `vp run <task>`. `vite-plus` is a local dev dependency: without the global CLI, prefix with `pnpm` (`pnpm vp check`). E2E: `pnpm test:e2e` (Playwright, builds then tests the production bundle; uses the installed Chrome locally). Logo-Alt icons: `pnpm icons:logo-alt`. No ESLint/Prettier/Biome. Docs: https://viteplus.dev/llms-full.txt

CI is GitHub Actions (`.github/workflows/ci.yml`); a tag `vX.Y.Z` publishes a release (`release.yml`).

## Conventions

- Logic in plain TS modules testable without the DOM; Preact components stay thin.
- Heavy work (indexing) in Web Workers. Lazy-load Shiki grammars and heavy plugins.
- Conventional commits, small and focused. `vp check` and `vp test` must pass before each commit.
- Any non-obvious architectural decision gets a short ADR in `docs/decisions/`.
- UI follows `design/` (read `design/README.md`, the brand book, before any UI work): tokens in `design/tokens.css`, components in `design/components/`, the logo in `design/assets/Logo-Alt/` (web icons in `config/brand.ts`, see ADR 0003), reference screens in `design/mockups/` (reader, search, resume, unsupported). Never hardcode colors, sizes or fonts; extend the design system first if something is missing. Fonts are self-hosted.

## Layout

`config/` build-time settings (browser targets, brand, Vite plugins incl. CSP) · `src/platform` capabilities · `src/fs` VirtualFS · `src/storage` IndexedDB · `src/tree` file index and tree · `src/markdown` pipeline · `src/highlight` Shiki · `src/app` session, router, documents, theme · `src/ui` components and screens · `src/sw` service worker and virtual file server · `tests/e2e` Playwright (OPFS fixtures stand in for the picker) · `docs/` architecture, security, ADRs.

## Working agreement

Plan first, then build by milestone. When a prompt says "spike", validate the assumption with a throwaway experiment and report before building on it. Flag disagreements with constraints instead of silently deviating.
