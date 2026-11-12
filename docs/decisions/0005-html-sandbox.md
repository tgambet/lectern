# 0005. Sandboxing HTML documents

- Status: accepted (spike, milestone 2); implemented in milestone 4
- Date: 2026-11-01
- Evidence: branch `spike/m2`, `spikes/m2/results-matrix.json` (Chrome 156, Playwright)

## Context

HTML documents in a repository must render with their relative CSS, images and SVG working offline, which means the service worker (SW) must answer their sub-resource requests from `/~/<rootId>/…`. They must also never reach app state, storage, the folder handle or the network. We did not know which `<iframe sandbox>` setups stay controlled by the SW.

## What the spike showed

A fixture (relative CSS with `@import` and `url()`, PNG, SVG via `<img>`, `<object>` and external `<use>`, a link, and a probe script trying to read the parent, `localStorage`, the IndexedDB handle and to reach a foreign origin) was loaded in each setup:

| Setup                                                                                            | SW serves the document   | SW serves sub-resources | Scripts                                                    | Reaches storage / handle | Reaches network |
| ------------------------------------------------------------------------------------------------ | ------------------------ | ----------------------- | ---------------------------------------------------------- | ------------------------ | --------------- |
| No sandbox (reference)                                                                           | yes                      | yes                     | run                                                        | **yes**                  | **yes**         |
| `sandbox=""`                                                                                     | **no** (goes to network) | no                      | blocked                                                    | no                       | n/a             |
| `sandbox="allow-same-origin"`                                                                    | yes                      | yes                     | blocked                                                    | no                       | no              |
| `sandbox="allow-scripts"`                                                                        | **no** (goes to network) | no                      | n/a                                                        | n/a                      | n/a             |
| `allow-scripts allow-same-origin`                                                                | yes                      | yes                     | run                                                        | **yes**                  | **yes**         |
| No attribute + SW header `CSP: sandbox allow-scripts`                                            | yes                      | **no** (opaque origin)  | run                                                        | no                       | partly          |
| `allow-same-origin` + strict SW CSP header                                                       | yes                      | yes                     | blocked (not even fetched)                                 | no                       | no              |
| srcdoc + parent `blob:` URLs                                                                     | n/a                      | n/a                     | blocked: opaque origins cannot load the parent's blob URLs |                          |                 |
| srcdoc + `data:` URLs + `<meta>` CSP                                                             | n/a                      | inlined                 | run                                                        | no                       | no              |
| `allow-scripts allow-same-origin` + SW header `CSP: sandbox allow-scripts` + SW-inlined document | yes                      | inlined                 | run                                                        | no                       | no              |
| Top-level visit to `/~/…`, no header                                                             | yes                      | yes                     | **run with the app's origin**                              | **yes**                  | **yes**         |
| Top-level visit to `/~/…`, SW CSP header                                                         | yes                      | yes                     | blocked                                                    | no                       | no              |

Three findings changed the plan:

1. In Chromium, an iframe with an opaque-origin sandbox is not controlled by the SW at all: even its own navigation request goes to the network. Opaque sandboxing and SW-served sub-resources cannot be combined.
2. A `/~/` URL opened as a top-level page (a link opened in a new tab, a pasted URL) is a full same-origin page. Without a header it can read the folder handle. The `sandbox` attribute does not protect that case; only a response header does.
3. `<object>` and `<embed>` requests never go through the SW, in any setup. Such sub-resources do not load offline.

## Decision

**Every document response from `/~/` carries a CSP header set by the SW**, in a single code path, whatever the request. Also `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`.

**Default, scripts off:**

- `<iframe sandbox="allow-same-origin">` pointing at `/~/<rootId>/<path>`.
- Header: `sandbox allow-same-origin; default-src 'self'; script-src 'none'; object-src 'none'; connect-src 'none'; form-action 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; media-src 'self'; frame-src 'self'`.
- Sub-resources and in-frame navigation are served natively by the SW. With no script, sharing the origin cannot be exploited. In return, the app can read the frame's location and attach link handlers to it: `.md` links route in-app, and the address bar follows navigation.

**Scripts on (opt-in, per document):**

- `<iframe sandbox="allow-scripts allow-same-origin">`, plus the header `sandbox allow-scripts; default-src 'none'; script-src data: 'unsafe-inline'; style-src data: 'unsafe-inline'; img-src data:; font-src data:; media-src data:; connect-src 'none'; form-action 'none'`.
- The header makes the document's origin opaque. The attribute must keep `allow-same-origin` only so that the SW still answers the navigation (finding 1).
- The SW serves an **inlined** version of the document: relative `src`/`href` (scripts, styles, images, fonts), including `url()` inside CSS, are rewritten to `data:` URLs before the response.
- Known limits: `fetch`, XHR, dynamic `import()`, workers and nested frames that load relative files do not work. The UI states this in the notice that turns scripts on.

**`<object>` / `<embed>`**: the service worker rewrites those pointing at an SVG to `<img>` before serving the document, in both modes. Other plugin content stays blocked (`object-src 'none'`).

## Rejected

- Opaque sandbox attribute (`allow-scripts` alone, or `""`): the SW never sees the document.
- srcdoc for scripts mode: it inherits the app's CSP, which would have to allow `data:` scripts and inline styles in the app itself.
- Blob URLs created by the app: refused in opaque frames.

## Consequences

- Scripts mode depends on the SW header for its isolation, because the attribute alone allows same-origin. An e2e test must load the malicious fixture in both modes and assert that storage, the handle and the network are unreachable. That code path stays tiny and is covered by unit tests.
- Fidelity in scripts mode is lower than in the default mode; that trade-off is accepted for the MVP.

## Implementation notes (milestone 4)

- Scripts mode is requested with `?lectern=scripts` on the document URL; the service worker inlines the document (`src/html/rewrite.ts`) and answers with the scripts policy. A link followed inside a scripts-mode frame loads without the parameter, so the next document comes back with scripts off, under the default header.
- Scripts mode injects, before any document script, an in-memory shim for `localStorage`, `sessionStorage` and `document.cookie`, which throw in an opaque origin. Values last as long as the page; nothing is persisted or shared with the app (e2e-checked). Other APIs are not shimmed.
- In the default mode the app follows the frame: its location updates the address bar (replacing the entry, since the frame already added one to the joint history), links to Markdown open in the reader, links outside the origin open in a new tab and never in the frame.
- The e2e suite loads a malicious document (inline script, `onerror`, `javascript:` link, iframe, auto-submitted form, beacon, image pixel, `top.location`, IndexedDB read) in both modes. It asserts that nothing reaches app state, storage or the folder handle, and that no request would leave the origin. Requests the browser blocks itself (CSP, sandbox) never get that far.
