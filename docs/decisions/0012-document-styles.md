# 0012. Document classes and a design system for HTML documents

- Status: accepted
- Date: 2026-11-06

## Context

Documentation needs callouts, and its authors want their HTML documents to look like the rest of Lectern. MDX was considered and set aside: it compiles to JavaScript, which the app's CSP (`script-src 'self'`, no `unsafe-eval`, Trusted Types) and the "repository content is untrusted" rule forbid. A declarative subset would cost about four days plus a second allowlist to keep in step with the sanitizer, for files most folders do not contain. Plain HTML with the design system's classes gives the same display components with no new format.

## Decision

**GitHub-style alerts** (`> [!NOTE]` and the four others) already render as a Notice through `rehypeAlerts`, a transform after the sanitizer. This decision builds on it: the same `lc-notice` classes are what an author writes by hand in HTML.

**Document classes in Markdown.** Raw HTML in Markdown may use a short allowlist of design-system classes (`documentClasses` in `src/markdown/schema.ts`): `lc-lede`, `lc-notice` and its variants and head. An explicit list, not an `lc-*` pattern, so a document cannot forge the app's own states (`lc-broken`, `lc-btn`, `lc-sr-only`).

**Design system for HTML documents.** A document opts in with `<meta name="lectern-theme" content="on">`. The service worker then links `/lectern-doc.css` first in `<head>`, so the document's own styles still win.

- The stylesheet is `src/styles/doc.css`: `tokens.css` + `components/bundle.css`, built as a second CSS-only entry with a stable name and precached. Fonts are the app's own, at their hashed `/assets/` URLs.
- The dark theme uses `@media (prefers-color-scheme: dark)`, not `data-theme`. The iframe's `color-scheme` already follows the app theme (Frame README), so the document follows the toggle, not only the OS. The dark values are repeated in `doc.css`; `tests/unit/doc-stylesheet.test.ts` fails if they drift from `tokens.css`.
- The opt-in lives in the document, so it is declarative, versioned with the repository and inert elsewhere: opened outside Lectern the meta does nothing and the page has its own styles.

## Consequences

- Scripts mode is not themed: its CSP allows only `data:` and inline styles, and the link would be blocked. The document keeps its own look there.
- The class names are an interface for authors. Renaming one is a breaking change for their documents; they are listed in `design/components/Prose/README.md`.
- In the dev server `/lectern-doc.css` is not served (the entry exists in builds only); the e2e suite runs on the production bundle.
- The meta tag is found with a regular expression over the markup, like the rest of the SW's rewriting (`src/html/rewrite.ts`). A tag written inside a comment or a script would also match, which only turns the stylesheet on.
- Still open: tabs, steps, cards and other components, and a copy of the stylesheet for documents read outside Lectern (fonts would fall back to system serif and sans).
