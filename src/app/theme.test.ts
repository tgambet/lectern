import { describe, expect, it } from "vite-plus/test";
import { nextTheme, parseThemePref, resolveTheme } from "./theme.ts";

describe("theme", () => {
  it("cycles auto → light → dark → auto", () => {
    expect(nextTheme("auto")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("auto");
  });

  it("follows the system only in auto", () => {
    expect(resolveTheme("auto", true)).toBe("dark");
    expect(resolveTheme("auto", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("falls back to auto on unknown stored values", () => {
    expect(parseThemePref(null)).toBe("auto");
    expect(parseThemePref("sepia")).toBe("auto");
    expect(parseThemePref("dark")).toBe("dark");
  });
});
