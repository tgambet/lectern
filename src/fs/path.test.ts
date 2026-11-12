import { describe, expect, it } from "vite-plus/test";
import { basename, dirname, extname, joinPath, normalizePath, resolvePath } from "./path.ts";

describe("normalizePath", () => {
  it.each([
    ["", ""],
    ["/", ""],
    ["a/b/", "a/b"],
    ["./a//b/./c", "a/b/c"],
    ["a/b/../c", "a/c"],
    ["a\\b", "a/b"],
  ])("%j → %j", (input, expected) => {
    expect(normalizePath(input)).toBe(expected);
  });

  it("refuses to climb above the root", () => {
    expect(() => normalizePath("..")).toThrow(/invalid-path/);
    expect(() => normalizePath("a/../../b")).toThrow(/invalid-path/);
  });
});

describe("resolvePath", () => {
  it.each([
    ["docs/guide.md", "setup.md", "docs/setup.md"],
    ["docs/guide.md", "./img/a.png", "docs/img/a.png"],
    ["docs/guide.md", "../README.md", "README.md"],
    ["docs/guide.md", "/README.md", "README.md"],
    ["README.md", "docs/", "docs"],
  ])("from %j, %j → %j", (from, rel, expected) => {
    expect(resolvePath(from, rel)).toBe(expected);
  });

  it("returns null outside the folder", () => {
    expect(resolvePath("README.md", "../secret")).toBeNull();
    expect(resolvePath("a/b.md", "../../c")).toBeNull();
  });
});

describe("path parts", () => {
  it("splits names and extensions", () => {
    expect(dirname("a/b/c.md")).toBe("a/b");
    expect(dirname("c.md")).toBe("");
    expect(basename("a/b/c.md")).toBe("c.md");
    expect(extname("a/b/C.MD")).toBe(".md");
    expect(extname("a/.gitignore")).toBe("");
    expect(extname("a/Makefile")).toBe("");
    expect(joinPath("a", "", "b/../c")).toBe("a/c");
  });
});
