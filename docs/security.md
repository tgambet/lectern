# Security model

Lectern renders documentation it did not write. Repository content is untrusted: it can contain arbitrary HTML, scripts, `javascript:` links, iframes and forms.

## Goals

1. Repository content cannot read app state, storage (IndexedDB, localStorage) or the folder handle.
2. Repository content cannot reach the network.
3. Lectern never writes to the opened folder.

## The app shell

- **CSP** on the app shell, injected at build time: `default-src 'self'`, `script-src 'self'`, `style-src 'self'`, `connect-src 'none'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`, `require-trusted-types-for 'script'`, `trusted-types default`. No inline script or style is allowed; HTML and script strings are refused by the Trusted Types default policy, script URLs must be same-origin (ADR 0010). E2e tests check the policy, that the main flows raise no violation, and that no request leaves the origin.
- **Read-only access**: the picker is called with `mode: "read"`; there is no write method on `VirtualFS`.
- **No third-party runtime resources**: fonts, icons and code are self-hosted and precached.

## What is stored, and where

Everything stays in the browser profile on this device (IndexedDB): opened folders and their handles, preferences, and the search index with the extracted text of documents (ADR 0009), bookmarks and notes (ADR 0014). Nothing is written to the folder, nothing is sent anywhere. The theme preference is in `localStorage`.

## HTML documents (ADR 0005)

HTML documents render in an iframe whose content the service worker serves from `/~/<rootId>/…`. Every such document response carries a CSP header, so the policy holds however the document is opened (in the frame, or as a top-level tab).

| Mode                | Iframe                                                                       | Document origin | Scripts                             | Sub-resources                |
| ------------------- | ---------------------------------------------------------------------------- | --------------- | ----------------------------------- | ---------------------------- |
| Default             | `sandbox="allow-same-origin"`                                                | app origin      | none (`script-src 'none'`, sandbox) | served by the SW             |
| Scripts on (opt-in) | `sandbox="allow-scripts allow-same-origin"` + header `sandbox allow-scripts` | opaque          | run                                 | inlined as `data:` by the SW |

### Threats and mitigations

| Threat                                                             | Default mode                                                                                                 | Scripts mode                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Read app state, `localStorage`, IndexedDB, the folder handle       | No script can run: sandbox without `allow-scripts`, and `script-src 'none'` in the header.                   | Opaque origin from the header's `sandbox`: storage access throws `SecurityError` (verified).            |
| Reach the network (fetch, beacon, image pixel, CSS `url()`)        | `connect-src 'none'`; other directives limited to `'self'`, `data:` and `blob:`.                             | `default-src 'none'`, resources `data:` only, `connect-src 'none'` (verified: nothing left the device). |
| Navigate or replace the app (`target=_top`, `window.top.location`) | Sandbox without `allow-top-navigation`; no script anyway.                                                    | Sandbox without `allow-top-navigation`.                                                                 |
| Popups, forms, downloads, modals                                   | Not granted (`allow-popups`, `allow-forms`, `allow-downloads`, `allow-modals` absent); `form-action 'none'`. | Same.                                                                                                   |
| `/~/…` opened as a top-level page                                  | Header sandbox applies: no script runs (verified).                                                           | Same.                                                                                                   |
| Plugins, `<object>`, `<embed>`                                     | `object-src 'none'`. These requests bypass the SW and do not load offline.                                   | Same.                                                                                                   |
| MIME confusion (a `.txt` served as HTML)                           | `Content-Type` from the extension, `nosniff`.                                                                | Same.                                                                                                   |

Residual risk: scripts mode relies on the SW header for isolation, because its attribute keeps `allow-same-origin` (required for the SW to see the navigation). The header is set in one code path for every `/~/` document (`src/sw/file-server.ts`, unit-tested), and the e2e suite runs a malicious fixture in both modes (`tests/e2e/html.spec.ts`): storage, the folder handle and the app's DOM stay out of reach, and no request would leave the origin.

Scripts are off by default and turned on per document, for the session only.

A document can opt in to Lectern's design system (`<meta name="lectern-theme" content="on">`, ADR 0012): the SW links `/lectern-doc.css`, a same-origin stylesheet allowed by `style-src 'self'`. No new directive, no script. Not done in scripts mode.

## Still to come

## Markdown (ADR 0008)

- All Markdown, raw HTML included, goes through `rehype-sanitize` (GitHub's schema, plus a few harmless elements): no script, style attribute, event handler, iframe, form, object, or URL scheme other than `http`, `https` and `mailto`. Unit tests cover the usual payloads.
- Raw HTML may carry only the design-system classes of `documentClasses` (`src/markdown/schema.ts`), an explicit list: a document cannot forge the app's own state classes (ADR 0012). GitHub-style alerts are built after sanitization from the sanitized tree.
- Author ids are prefixed (`user-content-`) so they cannot clobber DOM globals.
- The result is rendered as Preact elements, never through `innerHTML`.
- Remote images are not requested. External links open in a new tab with `noopener noreferrer`.
