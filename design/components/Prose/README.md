Prose is the reading surface: rendered Markdown inside `<article class="lc-prose">`, set in the `read-*` styles (Literata) in a column no wider than `measure`.

The consumer provides sanitized HTML produced from the Markdown (headings with ids, paragraphs, lists, blockquotes, tables, inline code). Use `class="lc-lede"` on the first paragraph under the title. Code blocks use CodeBlock; callouts use Notice.

- One `h1` per document; do not skip heading levels.
- Links are `accent` and underlined; never remove the underline.
- Tables use hairlines only: no zebra stripes, no cell borders. Each sits in an `lc-table-scroll` box, so a wide table scrolls on its own and never leaves the column.
- Blockquotes are indented italic text; do not add a colored left border.

## Repository content

Rendered Markdown also brings task lists (`contains-task-list`, disabled checkboxes in `accent`), footnotes (a ruled `footnotes` section in `ink-muted`), `details`/`summary`, `kbd`, `mark` and images capped at the column width.

- **Broken links** get `lc-broken`: `danger` color, dashed underline, a "(missing)" suffix so color is never the only cue, and a title "No file at `<href>`". Broken images are hidden.
- **GitHub alerts** (`> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`, marker alone on its line) become Notices spanning the column: Note, Tip and Important are `info`, Warning is `warn`, Caution is `danger`. The head keeps the interface type; the body keeps the reading type.
- **A reader's notes** wrap the quoted text in `mark.lc-note` (`accent-soft`, an `accent` underline so color is never the only cue), followed by an `lc-note-ref`: a numbered button that opens the note, with the note in its accessible name.
- **Remote images** are never loaded (nothing leaves this device): they become `lc-remote-img`, their alt text in a dashed hairline box.

## Classes for authors

Documents may use these classes, in Markdown (raw HTML) and in HTML documents: `lc-lede`, `lc-notice` with `lc-notice--info|warn|danger`, `lc-notice__head`. Markdown drops every other `lc-*` class; the list is `documentClasses` in `src/markdown/schema.ts`.

An HTML document gets the whole design system, tokens and components, by opting in:

```html
<meta name="lectern-theme" content="on">
<body class="lc-prose">
```

- Lectern links `/lectern-doc.css` first in `<head>`, so the document's own styles win. The dark theme follows Lectern's toggle (`prefers-color-scheme` inside the frame). Opened outside Lectern, the document is unchanged.
- `body.lc-prose` centers the page in the reading column on `paper`.
- Not applied when scripts are turned on for the document.
- Write semantic HTML (`details`, `aside`, `ol`) and let the classes dress it, so the page still reads without them.
