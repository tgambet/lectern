/**
 * Supported browsers, declared once. Used for the build target only; the app
 * still gates every feature at runtime through `src/platform/capabilities.ts`.
 *
 * 130 is the first Chrome/Edge release where a scrollable box takes keyboard
 * focus by itself, which wide code blocks and tables rely on (ADR 0004).
 */
export const browserTargets = {
  chrome: 130,
  edge: 130,
} as const;

/** Vite/Rolldown `build.target` (also used for `build.cssTarget`). */
export const buildTarget: string[] = Object.entries(browserTargets).map(
  ([name, version]) => `${name}${version}`,
);
