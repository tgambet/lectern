# 0004. Chrome and Edge 130 or later

- Status: accepted
- Date: 2026-11-01

## Context

The File System Access API exists in Chromium since 86, but persistent permissions ("Allow on every visit", and grants that survive restarts for installed apps) arrived in 122. The zero-click resume depends on them.

## Decision

- `config/targets.ts` declares Chrome 130 and Edge 130; it feeds `build.target` and `build.cssTarget`.
- At runtime, `src/platform/capabilities.ts` decides: without `showDirectoryPicker`, handle permissions, service workers, IndexedDB or workers, Lectern shows the unsupported screen. No user-agent sniffing.

## Consequences

Older Chromium versions that pass feature detection still run, but resume may cost one click more than promised.

## Amendment, 2026-11-09: 130 rather than 122

The floor was 122, for persistent permissions. It is now 130, the first release where a scrollable box with nothing focusable inside takes keyboard focus by itself. Wide code blocks and tables depend on that to scroll from the keyboard (WCAG 2.1.1); the alternative was a `tabindex` kept in step with each box's overflow. The feature cannot be detected, so Chromium 122 to 129 still runs, without keyboard scrolling in those boxes.
