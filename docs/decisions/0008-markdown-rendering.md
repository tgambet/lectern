# 0008. Rendering Markdown: sanitized HAST to Preact, links resolved against the folder

- Status: accepted
- Date: 2026-11-01

## Context

Markdown from a repository is untrusted. It must render with GFM, anchors, a table of contents, highlighted code, working relative links and images, under a CSP without `unsafe-inline`.

## Decision

- **Pipeline** (`src/markdown/pipeline.ts`): an explicit, ordered unified plugin list. Markdown syntax (GFM, YAML frontmatter), then `remark-rehype` and `rehype-raw` (raw HTML is parsed), then `rehype-sanitize` (GitHub's schema plus `mark`, `figure`, `abbr`, image sizes; schemes limited to `http`, `https`, `mailto`), then trusted transforms only: `rehype-slug`, link rewriting, outline. New syntax goes before `remark-rehype`; new HTML transforms after the sanitizer, and must only produce trusted markup.
- **Ids**: the sanitizer prefixes author ids with `user-content-` (no DOM clobbering). Heading slugs are added after it, unprefixed. Same-document links and `aria-describedby` are pointed at the prefixed id when that is the one that exists, so footnotes and raw-HTML anchors work natively.
- **Links** are resolved against the folder's file index. Documents and folders become in-app routes (`/read/<folder>/<path>#anchor`); other files and images become virtual file server URLs (`/~/<folderId>/<path>`). Missing targets are marked `lc-broken` ("No file at …"). External links open in a new tab, `noopener noreferrer`. Remote images are never fetched: they become their alt text in `lc-remote-img`.
- **Rendering**: the sanitized HAST is turned into Preact elements (`hast-util-to-jsx-runtime`), never `innerHTML`; `pre` maps to the `CodeBlock` component (language label, copy button).
- **Highlighting** (`src/highlight/`): Shiki core with the JavaScript regex engine (no WASM, so no `wasm-unsafe-eval`), 40 grammars as lazy chunks, precached. The theme uses placeholder colours that a transformer swaps for the design system's `tk-*` classes, so no inline style reaches the page and both themes follow the `--syn-*` tokens.
- **Bundle**: the pipeline (about 120 kB gzipped, mostly the HTML parser) and the highlighter (about 50 kB) load on the first Markdown document; the shell stays near 32 kB.
- **Routing**: History API. `/` resumes the last document; folders redirect to their README or index. The service worker's navigation fallback serves the shell for every route except `/~/`.

## Consequences

- Highlighting runs after sanitization on text content only, so a grammar cannot reintroduce markup.
- The file index must exist before a document renders (to resolve links); it is built once per folder and refreshed on focus at most every 30 s.
- Frontmatter is hidden; its `title` names the document. Showing it is a later option.
