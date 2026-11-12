Search is a field plus a result popover: `<div class="lc-search">` with `lc-search__field` and, while typing, a `<ul role="listbox">` of results on `paper-raised` with `shadow-popover`.

The consumer provides the query, the ranked results (title, path, snippet) and which result is selected. Wrap each matched term in `<mark>`; the highlight uses `highlight` behind `ink`, underlined so that it does not rest on color alone. Show the focus shortcut hint (`Ctrl K`) in the field when it is empty.

- Results show the document title, then its path in `code` style, then one snippet of at most two lines.
- The selected result uses `accent-soft` with the 2px `focus` ring (it stands in for the focus, and `accent-soft` alone is too faint to see); arrow keys move it, Enter opens it.
- An empty result list says: No document matches “query”.
- While the folder is still being indexed, the popover ends with a status line (`lc-search__status`): "Indexing… 1,240 of 5,012 documents". Results already found are shown above it.
- The field is a combobox: `role="combobox"`, `aria-expanded`, `aria-controls` on the listbox, `aria-activedescendant` on the selected option. Ctrl+K (Cmd+K) focuses it from anywhere; Esc closes the popover, then leaves the field.
