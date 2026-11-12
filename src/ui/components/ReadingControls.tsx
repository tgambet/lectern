import { readingWidth, zen, type ReadingWidth } from "../../app/preferences.ts";
import { Icon } from "./Icon.tsx";
import { Menu, MenuChoice } from "./Menu.tsx";

const widths: Array<[ReadingWidth, string]> = [
  ["normal", "Normal"],
  ["wide", "Wide"],
  ["full", "Full width"],
];

/** Header menu choosing the reading column's width, kept per device. */
export function WidthMenu() {
  return (
    <Menu id="width-menu" label="Reading width" icon="width" class="app-menu app-width">
      {(pick) => (
        <div role="group" aria-label="Reading width">
          {widths.map(([width, label]) => (
            <MenuChoice
              key={width}
              checked={readingWidth.value === width}
              onClick={pick(() => (readingWidth.value = width))}
            >
              {label}
            </MenuChoice>
          ))}
        </div>
      )}
    </Menu>
  );
}

/** Enters zen mode: the document alone. Alt+Z does the same; Escape leaves. */
export function ZenButton() {
  return (
    <button
      type="button"
      class="lc-btn lc-btn--ghost lc-btn--icon app-zen-toggle"
      aria-label="Zen mode: the document alone (Alt+Z)"
      aria-keyshortcuts="Alt+Z"
      title="Zen mode (Alt+Z)"
      onClick={() => (zen.value = true)}
    >
      <Icon name="zen" />
    </button>
  );
}

/** The one control left in zen mode, quiet until hovered or focused. */
export function ZenExit() {
  return (
    <button
      type="button"
      class="lc-btn lc-btn--ghost lc-btn--icon app-zen-exit"
      aria-label="Leave zen mode (Escape)"
      title="Leave zen mode (Esc)"
      onClick={() => (zen.value = false)}
    >
      <Icon name="close" />
    </button>
  );
}
