import { describe, expect, it } from "vite-plus/test";
import { isSearchShortcut, isZenShortcut } from "./keys.ts";

const press = (key: string, code: string, mods: Partial<KeyboardEvent> = {}) => ({
  key,
  code,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});

describe("isSearchShortcut", () => {
  it("is Ctrl+K or Cmd+K, Caps Lock included", () => {
    expect(isSearchShortcut(press("k", "KeyK", { ctrlKey: true }))).toBe(true);
    expect(isSearchShortcut(press("k", "KeyK", { metaKey: true }))).toBe(true);
    expect(isSearchShortcut(press("K", "KeyK", { ctrlKey: true }))).toBe(true);
  });

  it("never fires on the bare key or another combination", () => {
    expect(isSearchShortcut(press("k", "KeyK"))).toBe(false);
    expect(isSearchShortcut(press("/", "Slash"))).toBe(false);
    expect(isSearchShortcut(press("K", "KeyK", { ctrlKey: true, shiftKey: true }))).toBe(false);
  });
});

describe("isZenShortcut", () => {
  it("is Alt+Z, whatever the layout", () => {
    expect(isZenShortcut(press("z", "KeyZ", { altKey: true }))).toBe(true);
    // AZERTY: the letter z sits where QWERTY has w.
    expect(isZenShortcut(press("z", "KeyW", { altKey: true }))).toBe(true);
    // Option+Z on a Mac composes a character.
    expect(isZenShortcut(press("Ω", "KeyZ", { altKey: true }))).toBe(true);
  });

  it("does not take another letter on the same key", () => {
    expect(isZenShortcut(press("w", "KeyZ", { altKey: true }))).toBe(false);
  });

  it("never fires on the bare key or another combination", () => {
    expect(isZenShortcut(press("z", "KeyZ"))).toBe(false);
    expect(isZenShortcut(press("z", "KeyZ", { ctrlKey: true }))).toBe(false);
    expect(isZenShortcut(press("Z", "KeyZ", { altKey: true, shiftKey: true }))).toBe(false);
  });
});
