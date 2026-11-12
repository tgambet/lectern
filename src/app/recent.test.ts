import { describe, expect, it } from "vite-plus/test";
import { documentCount, lastOpened } from "./recent.ts";

const now = Date.UTC(2026, 10, 15, 12);
const daysAgo = (n: number) => now - n * 86_400_000;

describe("lastOpened", () => {
  it("speaks in days, then months", () => {
    expect(lastOpened(now - 3_600_000, now)).toBe("today");
    expect(lastOpened(daysAgo(1), now)).toBe("yesterday");
    expect(lastOpened(daysAgo(3), now)).toBe("3 days ago");
    expect(lastOpened(daysAgo(65), now)).toBe("2 months ago");
  });
});

describe("documentCount", () => {
  it("pluralises and tolerates unknown counts", () => {
    expect(documentCount(null)).toBeNull();
    expect(documentCount(1)).toBe("1 document");
    expect(documentCount(12)).toBe("12 documents");
  });
});
