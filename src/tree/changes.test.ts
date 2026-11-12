import { describe, expect, it } from "vite-plus/test";
import { relevantChanges, touches } from "./changes.ts";
import { createIgnoreRule } from "./ignore.ts";

describe("watched changes", () => {
  const ignore = createIgnoreRule({ gitignore: "generated/\n*.log\n" });

  it("drops changes under ignored folders and files, keeps the root .gitignore", () => {
    const changes = relevantChanges(
      [
        { type: "modified", path: ".git/index" },
        { type: "added", path: "node_modules/pkg/README.md" },
        { type: "added", path: "generated/out.md" },
        { type: "modified", path: "notes.log" },
        { type: "modified", path: ".gitignore" },
        { type: "removed", path: "docs/old.md" },
        { type: "unknown", path: "" },
      ],
      ignore,
    );
    expect(changes.map((c) => c.path)).toEqual([".gitignore", "docs/old.md", ""]);
  });

  it("keeps everything before the rules are known", () => {
    expect(relevantChanges([{ type: "added", path: ".git/x" }], null)).toHaveLength(1);
  });

  it("tells when a document's folder changed", () => {
    expect(touches(new Set(["site/style.css"]), "site/index.html")).toBe(true);
    expect(touches(new Set(["site/img/a.png"]), "site/index.html")).toBe(true);
    expect(touches(new Set(["docs/guide.md"]), "site/index.html")).toBe(false);
    expect(touches(new Set([""]), "site/index.html")).toBe(true);
    expect(touches(new Set(["docs/guide.md"]), "index.html")).toBe(true);
  });
});
