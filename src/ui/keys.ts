type Keys = Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">;

/** Ctrl+K, or Cmd+K: focuses the search. Modified, so it cannot fire by accident (WCAG 2.1.4). */
export function isSearchShortcut(event: Keys): boolean {
  return (
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.shiftKey &&
    event.key.toLowerCase() === "k"
  );
}

/**
 * Alt+Z toggles zen mode. `key` follows the keyboard layout (AZERTY included);
 * where Alt composes a character (Option+Z is "Ω" on a Mac), `code` stands in.
 */
export function isZenShortcut(event: Keys): boolean {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;
  return /^[a-z]$/i.test(event.key) ? event.key.toLowerCase() === "z" : event.code === "KeyZ";
}

/** True when a key press lands in a text field, where Escape belongs to the field. */
export function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}
