# Contributing

## Setup

Node and pnpm versions are pinned (`.node-version`, `devEngines` in `package.json`). Install dependencies with `pnpm install`, then use `vp` (global CLI) or `pnpm vp`.

## Before each commit

- `vp check` and `vp test` pass. Run `pnpm test:e2e` when you touch the app shell, the service worker or anything user-facing; it includes axe accessibility checks in both themes.
- UI changes: run `pnpm screenshots` if the README screenshots no longer match.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org) and stay small.
- A non-obvious architectural decision gets a short ADR in `docs/decisions/`.

## Ground rules

- Read-only: never request `readwrite`, never write to the opened folder.
- No network at runtime: no CDN, remote font, icon or analytics. The CSP and an e2e test enforce it.
- Feature detection only, in `src/platform/capabilities.ts`. No user-agent sniffing.
- All file access goes through `VirtualFS` (`src/fs/`); only `FileSystemAccessFS` touches handles.
- UI follows `design/` (start with `design/README.md`). Never hardcode a color, size or font; extend `design/` first.
- Keep logic in plain TypeScript modules testable without the DOM; Preact components stay thin.
