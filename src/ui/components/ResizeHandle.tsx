import { SIDEBAR_MAX, SIDEBAR_MIN, clampSidebar, sidebarWidth } from "../../app/preferences.ts";

const STEP = 16;

/** The design default, `--sidebar`, in pixels. */
function defaultWidth(): number {
  const token = getComputedStyle(document.documentElement).getPropertyValue("--sidebar");
  return parseFloat(token) || SIDEBAR_MIN;
}

const width = () => sidebarWidth.value ?? defaultWidth();

/** How far each "Narrower" or "Wider" goes: enough to be worth two clicks. */
const MENU_STEP = 48;

/** For the tree's menu: the splitter's job without dragging (WCAG 2.5.7). */
export function narrowTree() {
  sidebarWidth.value = clampSidebar(width() - MENU_STEP);
}

export function widenTree() {
  sidebarWidth.value = clampSidebar(width() + MENU_STEP);
}

export const canNarrowTree = () => width() > SIDEBAR_MIN;
export const canWidenTree = () => width() < SIDEBAR_MAX;

/**
 * `lc-splitter` on the tree's right edge: drag, or focus and use the arrows,
 * Home and End. Double-click (or Enter) returns to the default width. Without
 * dragging or a keyboard, the tree's menu has "Narrower" and "Wider".
 */
export function ResizeHandle() {
  const set = (next: number) => (sidebarWidth.value = clampSidebar(next));

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const handle = event.currentTarget as HTMLElement;
    const startX = event.clientX;
    const start = width();
    handle.setPointerCapture(event.pointerId);
    handle.dataset.dragging = "";
    const onMove = (e: PointerEvent) => set(start + e.clientX - startX);
    const onUp = () => {
      delete handle.dataset.dragging;
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
    event.preventDefault();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const current = width();
    switch (event.key) {
      case "ArrowLeft":
        set(current - STEP);
        break;
      case "ArrowRight":
        set(current + STEP);
        break;
      case "Home":
        set(SIDEBAR_MIN);
        break;
      case "End":
        set(SIDEBAR_MAX);
        break;
      case "Enter":
        sidebarWidth.value = null;
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div
      class="lc-splitter"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the file tree"
      aria-controls="file-tree"
      aria-valuemin={SIDEBAR_MIN}
      aria-valuemax={SIDEBAR_MAX}
      aria-valuenow={width()}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDblClick={() => (sidebarWidth.value = null)}
      onKeyDown={onKeyDown}
    />
  );
}
