The table of contents lists a document's second- and third-level headings beside the reading column, and marks the section being read.

The consumer provides the headings (text and id) and which one is current. Use `<nav class="lc-toc" aria-label="On this page">` with an `lc-label` title "On this page", then a list of `lc-toc__link` anchors; third-level items get `lc-toc__item--3`.

- The current section uses `aria-current="true"`: `accent`, weight 500. Others are `ink-muted`.
- Show it only when a document has two headings or more, and only when there is room beside the column (`toc` wide).
- Links jump to the heading; they never animate unless motion is allowed.
