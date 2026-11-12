import { describe, expect, it } from "vite-plus/test";
import { parseRoute, readUrl } from "./routes.ts";

describe("routes", () => {
  it("round-trips folder, path and anchor", () => {
    const url = readUrl("my docs", "guide/setup 1.md", "install");
    expect(url).toBe("/read/my%20docs/guide/setup%201.md#install");
    expect(parseRoute(new URL(url, "http://x").pathname)).toEqual({
      kind: "read",
      folder: "my docs",
      path: "guide/setup 1.md",
    });
  });

  it("addresses the folder root", () => {
    expect(readUrl("docs", "")).toBe("/read/docs");
    expect(parseRoute("/read/docs")).toEqual({ kind: "read", folder: "docs", path: "" });
    expect(parseRoute("/read/docs/")).toEqual({ kind: "read", folder: "docs", path: "" });
  });

  it("falls back to home on anything else", () => {
    expect(parseRoute("/")).toEqual({ kind: "home" });
    expect(parseRoute("/read/")).toEqual({ kind: "home" });
    expect(parseRoute("/read/docs/../../etc")).toEqual({ kind: "home" });
    expect(parseRoute("/read/%E0%A4%A")).toEqual({ kind: "home" });
  });
});
