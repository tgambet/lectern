import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";

const read = (path: string) => readFileSync(path, "utf8");

function tokens(block: string): string[] {
  return block
    .split(";")
    .map((d) => d.replace(/\s+/g, "").toLowerCase())
    .filter((d) => d.startsWith("--"));
}

describe("document stylesheet (src/styles/doc.css)", () => {
  it("repeats tokens.css's dark values in its media query, so they cannot drift", () => {
    const app = /\[data-theme="dark"\]\{([^}]*)\}/.exec(read("design/tokens.css"));
    const doc = /@media \(prefers-color-scheme: dark\) \{[^{]*\{([^}]*)\}/.exec(
      read("src/styles/doc.css"),
    );
    expect(app).not.toBeNull();
    expect(doc).not.toBeNull();
    expect(tokens(doc![1]!)).toEqual(tokens(app![1]!));
  });
});
