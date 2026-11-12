The file tree lists the opened folder's documents as nested `<ul role="tree">` rows inside `<nav class="lc-tree">`, set on `paper-sunken` with a `rule` hairline.

The consumer provides the folder's entries (already filtered by the ignore rules), the current path, and the open/closed state of each folder. A row is an `<a class="lc-tree__item">` whose depth is set with `style="--depth:N"`; the current document carries `aria-current="page"`. Folders show a chevron that rotates when `data-open` is set.

- Show only documents Lectern can render, plus folders that contain some.
- The current row uses `accent-soft`, weight 500 and a 2px `accent` left border: `accent-soft` alone is too faint to see on `paper-sunken`.
- Keep names exactly as on disk; truncate with an ellipsis, never wrap.
- The whole tree must be reachable by keyboard; the focus ring is drawn inside the row.

The tree can be resized: an `lc-splitter` (`role="separator"`) sits on its right edge, inside the `nav` so it belongs to the landmark. It shows a 2px hairline on hover and while dragging, in `focus` when focused; arrows, Home and End move it, double-click or Enter returns to `sidebar`. The chosen width overrides `--sidebar` on the tree's container and is kept per device.

The frame's head (`lc-tree__head`) holds the title and a `more` icon button opening an `lc-menu`: the view (Tree, Compact folders, Flat list, as `aria-pressed` buttons) and Expand all / Collapse all. Below it, `lc-tree__filter` narrows the list to documents whose path contains the text, opens every folder on the way and marks the matched text with `<mark>` (`highlight` behind `ink`). Only the list (`lc-tree__list`) scrolls: the frame keeps its border and corners at any height.

- Compact folders merges a chain of folders that each hold a single folder into one row (`design/assets/Logo`).
- Flat list shows each document's full path on one row: the folder in `ink-muted`, truncated first, then the file name.
- No match says: No document name matches “query”.
