import { describe, expect, it } from "vite-plus/test";
import { headersFor, parseFileUrl } from "./file-server.ts";

describe("virtual file server", () => {
  it("parses folder id and path, refusing to climb out", () => {
    expect(parseFileUrl("/~/abc/docs/a%20b.md")).toEqual({ folderId: "abc", path: "docs/a b.md" });
    expect(parseFileUrl("/~/abc/../../x")).toBeNull();
    expect(parseFileUrl("/~/")).toBeNull();
    expect(parseFileUrl("/read/x")).toBeNull();
  });

  it("sandboxes documents and never lets content be sniffed", () => {
    const html = headersFor("a/index.html");
    expect(html.get("Content-Security-Policy")).toMatch(
      /^sandbox allow-same-origin;.*script-src 'none'/,
    );
    expect(html.get("X-Content-Type-Options")).toBe("nosniff");
    const png = headersFor("a.png");
    expect(png.get("Content-Type")).toBe("image/png");
    expect(png.get("Content-Security-Policy")).toBeNull();
    expect(headersFor("a.unknown").get("Content-Type")).toBe("application/octet-stream");
  });

  it("gives scripts-mode documents an opaque origin and data:-only resources", () => {
    const csp = headersFor("a.html", "scripts").get("Content-Security-Policy")!;
    expect(csp).toMatch(/^sandbox allow-scripts;/);
    expect(csp).not.toContain("allow-same-origin");
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("connect-src 'none'");
  });
});
