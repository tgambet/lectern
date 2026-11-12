# 0010. Offline hardening: update prompt, Trusted Types, persistent storage

- Status: accepted
- Date: 2026-11-02

## Context

Milestone 6 hardens what earlier milestones built: updates must reach installed users without breaking a session, the CSP should forbid the injection sinks the app never uses, storage that holds folder handles and the search index should not be evicted, and a large repository must stay responsive.

## Decision

- **Updates**: the service worker keeps `registerType: "prompt"`. When a new version is waiting, a toast says "A new version of Lectern is ready." with Reload, which activates it and reloads. No silent takeover in the middle of reading. Before this, a waiting worker only activated once every Lectern tab and window was closed.
- **Install**: the browser's install prompt is captured and offered as an "Install app" button in the header while available. The address bar icon still works.
- **Trusted Types**: the CSP adds `require-trusted-types-for 'script'; trusted-types default`. The default policy (`src/platform/trusted-types.ts`, loaded first) refuses HTML and script strings outright and allows script URLs from our own origin only (search worker, service worker). An e2e test walks the main flows and fails on any CSP or Trusted Types violation.
- **Persistent storage**: `navigator.storage.persist()` is requested when a folder opens. Chrome decides silently; there is no prompt.
- **Checks**: installability through `Page.getInstallabilityErrors` (instead of Lighthouse's removed PWA category); grammars and fonts served from the precache with the network off from the start; a generated 5,000-file repository (3,001 documents) that must open, search while indexing, and finish without any long task above 500 ms on the main thread.

## Measured (local, Chrome, the generated repository)

- Tree and first document: as soon as the walk finishes (the folder walk is async and yields between directories).
- Full index: about 7 s for 3,001 documents, off the main thread; results are available before it ends.
- Long tasks on the main thread after opening: none.

## Consequences

- No tree virtualization yet: a folder with thousands of direct children would render them all. To revisit if a real repository needs it.
- Trusted Types makes any future `innerHTML` or string-built script fail loudly, by design.
