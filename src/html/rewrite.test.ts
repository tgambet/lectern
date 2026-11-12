import { describe, expect, it } from "vite-plus/test";
import {
  hasScripts,
  injectStorageShim,
  injectTheme,
  wantsTheme,
  inlineResources,
  resolveRelative,
  svgObjectsToImages,
} from "./rewrite.ts";

const files: Record<string, string> = {
  "docs/app.js": "document.title = 'ran';",
  "docs/style.css": '@import "base.css";\nbody { background: url("img/bg.png"); }',
  "docs/base.css": "h1 { color: red; }",
  "docs/img/bg.png": "PNG",
  "docs/img/logo.svg": "<svg/>",
  "fonts/a.woff2": "FONT",
};
const read = async (path: string) => (path in files ? new Blob([files[path]!]) : null);
const b64 = (s: string) => btoa(s);

describe("resolveRelative", () => {
  it("resolves inside the folder only", () => {
    expect(resolveRelative("docs/a.html", "img/x.png?v=1#y")).toBe("docs/img/x.png");
    expect(resolveRelative("docs/a.html", "../fonts/a%20b.woff2")).toBe("fonts/a b.woff2");
    expect(resolveRelative("docs/a.html", "../../x")).toBeNull();
    expect(resolveRelative("docs/a.html", "https://x.test/a.png")).toBeNull();
    expect(resolveRelative("docs/a.html", "//x.test/a.png")).toBeNull();
    expect(resolveRelative("docs/a.html", "data:image/png;base64,AA")).toBeNull();
    expect(resolveRelative("docs/a.html", "#top")).toBeNull();
  });
});

describe("svgObjectsToImages", () => {
  it("turns SVG objects and embeds into images, keeping their size", () => {
    expect(
      svgObjectsToImages('<object data="a.svg" type="image/svg+xml" width="8">fallback</object>'),
    ).toBe('<img src="a.svg" width="8" alt="">');
    expect(svgObjectsToImages('<embed src="b.svg" height="4">')).toBe(
      '<img src="b.svg" height="4" alt="">',
    );
    expect(svgObjectsToImages('<object data="movie.swf"></object>')).toBe(
      '<object data="movie.swf"></object>',
    );
  });
});

describe("inlineResources", () => {
  it("embeds scripts, stylesheets (with imports and urls) and images", async () => {
    const out = await inlineResources(
      '<link rel="stylesheet" href="style.css"><script src="app.js"></script><img src="img/logo.svg" srcset="x 2x">',
      "docs/index.html",
      read,
    );
    expect(out).toContain(`src="data:text/javascript;base64,${b64(files["docs/app.js"]!)}"`);
    expect(out).toContain('src="data:image/svg+xml;base64,');
    expect(out).not.toContain("srcset");
    const css = atob(/href="data:text\/css;base64,([^"]+)"/.exec(out)![1]!);
    expect(css).toContain(`@import "data:text/css;base64,${b64("h1 { color: red; }")}"`);
    expect(css).toContain(`url("data:image/png;base64,${b64("PNG")}")`);
  });

  it("rewrites url() in style blocks and attributes", async () => {
    const out = await inlineResources(
      "<style>@font-face { src: url(../fonts/a.woff2); }</style><div style=\"background: url('img/bg.png')\"></div>",
      "docs/index.html",
      read,
    );
    expect(out).toContain(`url("data:font/woff2;base64,${b64("FONT")}")`);
    expect(out).toContain(`style="background: url('data:image/png;base64,${b64("PNG")}')"`);
  });

  it("leaves remote, missing, oversized and non-stylesheet links alone", async () => {
    const html =
      '<script src="https://cdn.test/x.js"></script><img src="missing.png"><link rel="canonical" href="app.js"><img src="img/bg.png">';
    const out = await inlineResources(html, "docs/index.html", read, { maxFileBytes: 2 });
    expect(out).toBe(html);
  });
});

describe("hasScripts", () => {
  it("detects script elements and inline handlers", () => {
    expect(hasScripts("<p>x</p><SCRIPT>1</SCRIPT>")).toBe(true);
    expect(hasScripts('<img src=x onerror="1">')).toBe(true);
    expect(hasScripts("<p>no scripts, only the word onion=</p>")).toBe(false);
  });
});

describe("injectStorageShim", () => {
  it("runs before every document script", () => {
    const out = injectStorageShim(
      '<!doctype html><html><head><meta charset="utf-8"><script>x()</script>',
    );
    expect(out.indexOf("memoryStorage")).toBeLessThan(out.indexOf("x()"));
    expect(out.indexOf("<head>")).toBeLessThan(out.indexOf("memoryStorage"));
  });

  it("works without a head element", () => {
    const out = injectStorageShim("<!DOCTYPE html><p>x</p><script>y()</script>");
    expect(out.startsWith("<!DOCTYPE html><script>")).toBe(true);
    expect(injectStorageShim("<p>x</p>").startsWith("<script>")).toBe(true);
  });
});

describe("lectern-theme opt-in", () => {
  const meta = '<meta name="lectern-theme" content="on">';

  it("detects the opt-in whatever the attribute order or quotes", () => {
    expect(wantsTheme(`<head>${meta}</head>`)).toBe(true);
    expect(wantsTheme("<meta content='on' name='lectern-theme'>")).toBe(true);
    expect(wantsTheme('<meta name="lectern-theme" content="off">')).toBe(false);
    expect(wantsTheme('<meta name="viewport" content="on">')).toBe(false);
    expect(wantsTheme("<p>lectern-theme</p>")).toBe(false);
  });

  it("links the stylesheet first in head, ahead of the document's own styles", () => {
    const out = injectTheme(
      `<!doctype html><head>${meta}<link rel="stylesheet" href="a.css"></head>`,
    );
    expect(out.indexOf("/lectern-doc.css")).toBeLessThan(out.indexOf("a.css"));
    expect(out.match(/lectern-doc\.css/g)).toHaveLength(1);
  });

  it("works without a head, and leaves other documents untouched", () => {
    expect(injectTheme(`<!doctype html>${meta}<p>x</p>`)).toMatch(/^<!doctype html><link /);
    const plain = "<head><title>x</title></head>";
    expect(injectTheme(plain)).toBe(plain);
  });
});
