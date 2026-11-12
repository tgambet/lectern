Working mark for Lectern: a lectern in profile, drawn as one 4.5 px round stroke on a 64 px grid.

- `lectern-mark.svg`: ink-blue strokes (`#2F4B8A`, the light-theme `accent`). Use on `paper` and `paper-raised`.
- `lectern-mark-ink.svg`: strokes in `#1E1B18` (the light-theme `ink`). Use for one-color printing and monochrome contexts.
- `lectern-mark-paper.svg`: strokes in `#E9E4DC` (the dark-theme `ink`). Use on `paper` in the dark theme and on dark photos.

These are single-ink images shown through `<img>`, so they cannot follow the theme: pick the variant that matches the ground. Generate the PWA icons (192, 512, maskable, favicon) from `lectern-mark.svg` with `@vite-pwa/assets-generator`; for a maskable icon keep the mark inside the central 80% on a `paper` square. Below 24 px, use a stroke of 6 instead of 4.5.
