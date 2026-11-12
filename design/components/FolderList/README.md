The folders Lectern already knows, most recently opened first: `<ul class="lc-folders">` on `paper-raised` with a `rule` hairline. Each row (`lc-folders__row`) has a button `lc-folders__open` with the folder name and, underneath in `lc-folders__meta` (mono, `ink-muted`), the document count and when it was last opened ("128 documents · today"). Choosing a row opens that folder; no picker.

Used in three places:

- **Home screen**, under the card, with a "Forget" button on each row (`lc-folders__forget`). Forgetting removes Lectern's memory of the folder (record, permission, search index); the folder on disk is never touched.
- **Resume screen**, under the card, same list.
- **Reader header**, as a popover (`lc-folders-panel`, `shadow-popover`, right-aligned under the trigger) opened from the folder name (`lc-folders-menu` wraps the trigger); the list inside is `lc-folders lc-folders--flat`. The current folder is marked `aria-current="true"`. After an `lc-folders__sep`, ghost buttons: "Open another folder…" and "Close folder". No Forget in the popover.

- The trigger is a disclosure button (`aria-expanded`, `aria-controls`), not an ARIA menu. Escape and a click outside close it and return focus to the trigger.
- The demo folder is not listed: it is never stored. It stays a button on the home screen.
- Hide the list when there is nothing to show.
