The frame shows an HTML document from the folder in a sandboxed iframe, on a sheet of its own, with an optional notice about its scripts above it.

The consumer provides the iframe (its `sandbox` and `src` decided by the app, see ADR 0005), the document's title for the iframe's `title`, and whether its scripts are on. Use `lc-frame` around an optional `lc-notice` and an `lc-frame__sheet` holding the iframe.

- The sheet follows the theme, and so does the iframe's `color-scheme`: documents that style `prefers-color-scheme: dark` switch with Lectern; documents with no dark styles keep the browser's white page, so they stay readable.
- The sheet fills the reading area; the document scrolls inside it.
- Scripts off (default), when the document has scripts: `lc-notice--info`, label "Scripts", "This document has scripts. They are off.", action "Run scripts".
- Scripts on: `lc-notice--warn`, label "Scripts on", say they run without access to files, storage or the network and that parts loading other files may not work, action "Turn scripts off".
- Notice actions sit in `lc-notice__actions`, default buttons, never primary.
- The frame view starts with the document's name as a visually hidden `h1` (`lc-sr-only`), so the page keeps a heading outside the iframe.
