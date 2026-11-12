Lectern is a calm reading tool for documentation that lives in a folder: paper and ink, no IDE chrome. Everything here serves one idea, *your docs, read where they live*, and one promise: read-only, local, private. Build every screen so a rendered document is the loudest thing on it.

## Content fundamentals

- **Voice:** quiet, factual, short. Say what happened and what the person can do next. No exclamation marks, no emoji, no jokes in errors.
- **Casing:** sentence case everywhere (buttons, headings, labels). Product name is always `Lectern`, capital L.
- **Person:** address the reader as "you" only when an action is needed; otherwise state the fact. Folder and file names are quoted as they appear on disk, in `code`.
- **Privacy is a feature, state it plainly:** "Nothing leaves this device." Never "secure", "military-grade" or similar.
- **Real examples:**
  - Resume screen: "Resume *docs*", with the path and the document count underneath, and "Open another folder…".
  - Permission lost: "Lectern needs your permission again to read *docs*. Your files are not changed."
  - Unsupported browser: "This browser can't open local folders yet. Use Chrome or Edge."
  - Broken link: "No file at `../guides/setup.md`."
  - Empty search: "No document matches “offline cache”."
- **Never write:** "Oops", "Whoops", "Something went wrong" without a cause, "Please", "Simply", "Awesome".

## Visual foundations

- **Concept:** paper and ink. The page is warm paper (`paper`), text is ink (`ink`), and the single accent is an ink blue (`accent`) used for links, the current item, the primary button and the focus ring. In dark mode the paper turns charcoal and the accent lightens; both themes come from the same tokens.
- **Color:** use `paper` for the page, `paper-sunken` for the sidebar and code blocks, `code-ground` for inline code, `paper-raised` for popovers and notices. Text is `ink`; secondary text is `ink-muted`. `rule` is for decorative hairlines, `rule-strong` for control borders. `highlight` is only for search matches, which are also underlined so they do not rest on color alone; a reader's notes use `accent-soft` with an `accent` underline. `warn`, `danger`, `ok` always come with a word or an icon, never color alone.
- **Type:** documents are set in `read-*` styles (Literata). Interface chrome is `ui`, `ui-strong`, `ui-label`, `ui-title` (Inter). Code and paths are `code` (JetBrains Mono). Keep body text in a column no wider than `measure`. Fonts are self-hosted woff2 under `fonts/`; never load fonts from a network. Font licences are SIL OFL 1.1: ship their licence texts with the app.
- **Spacing:** steps `space-1` to `space-8`; the sidebar is `sidebar` wide, the reading column `measure`, the table of contents `toc`. Be generous: paragraphs breathe at `space-4`, sections at `space-6`.
- **Borders, not shadows:** separate regions with a 1px `rule` hairline. The only shadow is `shadow-popover`, for search results and menus.
- **Radii:** `radius-sm` for inline code and tree items, `radius-md` for buttons, inputs and code blocks, `radius-lg` for cards, popovers and notices.
- **Focus and states:** every interactive element shows a solid 2px `focus` ring with a 2px offset. Hover shifts the background to `paper-sunken` (or `paper-raised` inside the sidebar); the selected tree row uses `accent-soft` with `ink` text, weight 500 and a 2px `accent` left border. Disabled controls drop to 45% opacity and stay readable.
- **Layout:** three quiet regions: file tree, reading column, optional table of contents. Reading column is centered in its space; nothing sits to its left but whitespace.
- **Scrollbars:** thin, a `rule-strong` thumb on a transparent track, everywhere (tree, code, page). `color-scheme` follows the theme so native controls match.
- **Motion:** none required. Respect `prefers-reduced-motion`; if a transition exists it is under 150 ms and only changes color or opacity.
- **Imagery:** the document's own images and diagrams are shown as authored, on `paper`. No decorative imagery, no gradients, no illustrations in the app chrome.

## Iconography

Icons are inline SVG, 16 px, stroke 1.5 px, `currentColor`, round caps and joins, no fills. The set is deliberately tiny: chevron, folder, document, search, sun, moon, copy, check, alert, more (three dots, for a menu of options), width (a double arrow between two bars), zen (four corners), close, bookmark (with a check once set), note (a speech balloon), list. Never use emoji or an icon font. The icon library is not chosen yet; until it is, draw icons to this specification.

## Logo

The mark is a lectern in profile: a slanted desk with a small ledge, a post and a base, in one 4.5 px stroke on a 64 px grid. Use `assets/Logo-Alt/lectern-mark.svg` (ink blue) on `paper`, `lectern-mark-ink.svg` where a single dark ink is needed, and `lectern-mark-paper.svg` on dark grounds. It lives in `assets/Logo-Alt/` (SVG sources; the favicons and PWA icons in `web/` are generated with `pnpm icons:logo-alt`). The PWA icons are the mark in `paper` on an `accent` square so they read on any ground; the SVG favicon is transparent and follows the OS theme. Keep clear space of half the mark's width on every side and do not display it below 16 px.

## Components

Components are plain CSS classes in `components/bundle.css`, prefixed `lc-`, with no framework dependency; each component's folder holds its guidelines and a live preview. Compose screens from them rather than restyling: `lc-btn`, `lc-tree`, `lc-prose`, `lc-code`, `lc-search`, `lc-resume`, `lc-notice`, `lc-dialog`.
