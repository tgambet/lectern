A code block shows a fenced snippet on `paper-sunken` inside `<div class="lc-code">`: a header with the language label and a Copy button, then a scrollable `<pre><code>`.

The consumer provides the highlighted markup (Shiki output mapped to the `tk-kw`, `tk-str`, `tk-num`, `tk-cm`, `tk-fn`, `tk-ty`, `tk-p` classes, which bind to the `syn-*` tokens) and the language label. Unknown languages render as plain `ink` text.

- Never wrap lines; let the block scroll horizontally.
- Keep the Copy button reachable by keyboard and announce "Copied" in a live region.
- Do not add line numbers unless the file is shown as source.
