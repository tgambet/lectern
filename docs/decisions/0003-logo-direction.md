# 0003. One switch for the logo direction

- Status: accepted, then settled (see Outcome)
- Date: 2026-11-01

## Context

Two logo directions live in `design/assets/`: `Logo/` (folded page with a serif L, icons included) and `Logo-Alt/` (lectern in profile, SVG only). The choice will be made in use; afterwards the other one is removed.

## Decision

- `config/brand.ts` holds `activeBrand` (now `"logo"`) and, per direction, the folder and file names of its favicons and PWA icons.
- A Vite plugin (`config/vite-plugins.ts`) serves the active set at the site root and adds the head links; the manifest reads the same config.
- In the UI, `Logo` and `LogoMark` (`src/ui/components/Logo.tsx`) render the active direction. Logo uses its horizontal lockup at 36 px (its serif symbol needs 33 px or more); Logo-Alt uses the stroked mark in `currentColor`.
- Logo-Alt icons are generated once with `pnpm icons:logo-alt` (`@vite-pwa/assets-generator`) into `design/assets/Logo-Alt/web/`. Favicons come from `lectern-mark-small.svg` (stroke 6, for 24 px and below).

## Consequences

Switching is one constant. Removing the losing direction: delete its folder, its `brandWebAssets` entry, its branch in `Logo.tsx`, and (for Logo-Alt) the generator script and config.

## Outcome

2026-11-02: Logo-Alt (lectern in profile) was chosen. `design/assets/Logo/`, the `activeBrand` switch, its `brandWebAssets` entries and the `Logo.tsx` branch were removed; `config/brand.ts` now lists the single set of web icons. The raster icons are the mark in `paper` on an `accent` square (the stroked mark in `accent` had too little contrast on dark launchers and tabs), and the SVG favicon follows the OS theme with `prefers-color-scheme`.
