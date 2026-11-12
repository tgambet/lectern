import { useEffect } from "preact/hooks";

type Ref = { current: HTMLElement | null };

/**
 * Closes an open popover on a click or a focus move outside `root`, or on Escape,
 * which returns focus to `trigger`.
 */
export function useDismiss(open: boolean, close: () => void, root: Ref, trigger: Ref) {
  useEffect(() => {
    if (!open) return;
    const onOutside = (event: Event) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      close();
      trigger.current?.focus();
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("focusin", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("focusin", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
}
