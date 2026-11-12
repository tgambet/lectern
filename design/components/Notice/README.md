A notice is a boxed message on `paper-raised` with a `rule` hairline: `<div class="lc-notice lc-notice--info|warn|danger" role="note">` holding a header line (icon plus a word) and one or two sentences.

The consumer provides the kind, the label word and the text. The word is always shown: "Note", "Permission needed", "Unsupported browser". Color only reinforces it.

- State the cause and what the person can do; no apologies.
- Use `info` for neutral callouts in documents (GitHub-style alerts map here), `warn` for recoverable situations, `danger` for blocking ones.
- Do not stack more than three notices on one screen.
- No colored left border and no tinted fill: the type color and icon carry the kind.
- A notice may end with actions in `lc-notice__actions`: small default buttons, never primary (for example "Run scripts").
- Inside `lc-toast`, a notice floats at the bottom right with `shadow-popover`, for app-level news that is not about the document (only use: "A new version of Lectern is ready." with Reload). One toast at a time.
