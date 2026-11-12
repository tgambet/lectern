import { describe, expect, it } from "vite-plus/test";
import {
  SIDEBAR_MAX,
  SIDEBAR_MIN,
  clampSidebar,
  parseReadingWidth,
  parseSidebarWidth,
} from "./preferences.ts";

describe("sidebar width", () => {
  it("stays within bounds", () => {
    expect(clampSidebar(10)).toBe(SIDEBAR_MIN);
    expect(clampSidebar(5000)).toBe(SIDEBAR_MAX);
    expect(clampSidebar(300.4)).toBe(300);
  });

  it("falls back to the design default on missing or bad values", () => {
    expect(parseSidebarWidth(null)).toBeNull();
    expect(parseSidebarWidth("")).toBeNull();
    expect(parseSidebarWidth("wide")).toBeNull();
    expect(parseSidebarWidth("360")).toBe(360);
    expect(parseSidebarWidth("9999")).toBe(SIDEBAR_MAX);
  });
});

describe("reading width", () => {
  it("falls back to normal on unknown stored values", () => {
    expect(parseReadingWidth(null)).toBe("normal");
    expect(parseReadingWidth("huge")).toBe("normal");
    expect(parseReadingWidth("wide")).toBe("wide");
    expect(parseReadingWidth("full")).toBe("full");
  });
});
