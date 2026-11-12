The resume card is the first screen when a folder was opened before: Lectern shows the folder's name, path and document count, and one primary button that asks the browser for permission again.

The consumer provides the folder name, its path as stored, the document count, and handlers for Resume and Open another folder. Use `lc-resume` on `paper-raised`, the accent-colored mark on top, `lc-btn--primary` for Resume and the default button for the alternative.

- Resume is the only primary action and takes focus on load.
- End with the privacy line "Nothing leaves this device." in `ink-muted`.
- If permission is already granted, skip this screen and open the folder directly.

## First run

When no folder was ever opened, the same card welcomes the reader: the mark, the name, one sentence on what Lectern does in `lc-resume__lede` (`font-serif`, `ink-muted`), a single primary button "Open a folder…", and the privacy line "Read-only. Nothing leaves this device."

- "Open a folder…" is the primary action and takes focus on load. A default button, "Try the demo folder", opens the built-in demo.
- No path or document count: there is nothing to resume yet, so `lc-resume__meta` is left out.
