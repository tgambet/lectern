A button is a plain `<button class="lc-btn">` with one of three emphasis levels: `lc-btn--primary` (accent fill), default (outlined with `rule-strong`) and `lc-btn--ghost` (no border).

Provide a short sentence-case label (verb first: "Resume docs", "Open another folder…") or, for `lc-btn--icon`, an `aria-label` and a 16 px icon from the icon sprite.

- Use at most one primary button per screen region.
- Use `disabled` for unavailable actions and keep the label readable; do not hide the button.
- Do not recolor buttons: states are `warn`/`danger` text in a notice, never a red or yellow fill.

- Skip link: every screen with a header starts with `<a class="lc-btn lc-btn--primary lc-skip" href="#main">`, hidden until it receives keyboard focus.
