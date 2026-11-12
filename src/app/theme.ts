import { effect, signal } from "@preact/signals";

export type ThemePref = "auto" | "light" | "dark";
export type Theme = "light" | "dark";

/** Shared with public/theme-boot.js, which applies the theme before first paint. */
export const THEME_STORAGE_KEY = "lectern.theme";

const order: ThemePref[] = ["auto", "light", "dark"];

export function nextTheme(pref: ThemePref): ThemePref {
  return order[(order.indexOf(pref) + 1) % order.length] ?? "auto";
}

export function resolveTheme(pref: ThemePref, systemDark: boolean): Theme {
  return pref === "auto" ? (systemDark ? "dark" : "light") : pref;
}

export function parseThemePref(value: string | null): ThemePref {
  return value === "light" || value === "dark" ? value : "auto";
}

// Theme lives in localStorage, not IndexedDB: theme-boot.js must read it synchronously.
function readStored(): ThemePref {
  try {
    return parseThemePref(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "auto";
  }
}

export const themePref = signal<ThemePref>(
  typeof localStorage === "undefined" ? "auto" : readStored(),
);

/** Keeps `<html data-theme>` and storage in sync with `themePref` and the system setting. */
export function startTheme(root: HTMLElement = document.documentElement): () => void {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const systemDark = signal(media.matches);
  const onChange = () => (systemDark.value = media.matches);
  media.addEventListener("change", onChange);
  const stop = effect(() => {
    root.dataset.theme = resolveTheme(themePref.value, systemDark.value);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themePref.value);
    } catch {
      // Storage blocked: the choice lasts for this session only.
    }
  });
  return () => {
    stop();
    media.removeEventListener("change", onChange);
  };
}
