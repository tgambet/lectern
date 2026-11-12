/**
 * HTML rewriting done by the service worker before serving a document
 * (ADR 0005). No DOM is available there, so this works on the markup with
 * conservative regular expressions: it only ever rewrites URLs it resolves
 * inside the folder, and leaves anything it does not understand untouched.
 */
import { mimeType } from "../fs/mime.ts";
import { extname, resolvePath } from "../fs/path.ts";

/** Reads a folder file as bytes; `null` when it does not exist. */
export type ReadFile = (path: string) => Promise<Blob | null>;

const SCHEME = /^[a-z][a-z\d+.-]*:/i;

/** A relative URL resolved against `fromPath`, without query or fragment; `null` otherwise. */
export function resolveRelative(fromPath: string, url: string): string | null {
  const trimmed = url.trim();
  if (
    trimmed === "" ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("//") ||
    SCHEME.test(trimmed)
  ) {
    return null;
  }
  const path = trimmed.replace(/[?#].*$/, "");
  try {
    return resolvePath(fromPath, decodeURI(path));
  } catch {
    return resolvePath(fromPath, path);
  }
}

/**
 * `<object>`/`<embed>` requests bypass service workers in every browser, so
 * an SVG embedded that way never loads offline. Rewritten to `<img>`.
 */
export function svgObjectsToImages(html: string): string {
  return html
    .replace(
      /<object\b([^>]*?)\bdata=(["'])([^"']+\.svg)\2([^>]*)>([\s\S]*?)<\/object>/gi,
      (_m, a, _q, src, b) => {
        const size = `${a} ${b}`.match(/\b(?:width|height)=(["'])[^"']*\1/gi)?.join(" ") ?? "";
        return `<img src="${src}" ${size} alt="">`;
      },
    )
    .replace(/<embed\b([^>]*?)\bsrc=(["'])([^"']+\.svg)\2([^>]*)>/gi, (_m, a, _q, src, b) => {
      const size = `${a} ${b}`.match(/\b(?:width|height)=(["'])[^"']*\1/gi)?.join(" ") ?? "";
      return `<img src="${src}" ${size} alt="">`;
    });
}

async function toDataUrl(blob: Blob, path: string): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mimeType(path).split(";")[0]};base64,${btoa(binary)}`;
}

export interface InlineOptions {
  /** Files larger than this stay as they are (and will not load). */
  maxFileBytes?: number;
  /** Stop inlining once this many bytes were embedded. */
  maxTotalBytes?: number;
}

/** Replaces matches of `pattern` asynchronously, in order. */
async function replaceAsync(
  input: string,
  pattern: RegExp,
  replacer: (match: RegExpExecArray) => Promise<string>,
): Promise<string> {
  const parts: string[] = [];
  let last = 0;
  for (const match of input.matchAll(pattern)) {
    parts.push(input.slice(last, match.index), await replacer(match as RegExpExecArray));
    last = match.index + match[0].length;
  }
  parts.push(input.slice(last));
  return parts.join("");
}

const CSS_URL = /url\(\s*(["']?)([^"')]+)\1\s*\)/gi;
const CSS_IMPORT = /@import\s+(["'])([^"']+)\1/gi;
const HTML_ATTR =
  /(<(?:script|img|source|audio|video|track|input|link|image)\b[^>]*?\s)(src|href|poster|xlink:href)=(["'])([^"']*)\3/gi;
const STYLE_BLOCK = /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi;
const STYLE_ATTR = /(\sstyle=)(?:"([^"]*)"|'([^']*)')/gi;

/**
 * Scripts mode: the document runs in an opaque origin, so the service
 * worker never sees its sub-resources. Every relative script, stylesheet,
 * image, font and media file is embedded as a `data:` URL instead, CSS
 * `url()` and `@import` included (a few levels deep). `srcset` is dropped.
 */
export async function inlineResources(
  html: string,
  docPath: string,
  read: ReadFile,
  options: InlineOptions = {},
): Promise<string> {
  const maxFile = options.maxFileBytes ?? 5 * 1024 * 1024;
  let budget = options.maxTotalBytes ?? 25 * 1024 * 1024;

  const embed = async (fromPath: string, url: string, depth = 0): Promise<string | null> => {
    const path = resolveRelative(fromPath, url);
    if (path === null) return null;
    const blob = await read(path);
    if (!blob || blob.size > maxFile || blob.size > budget) return null;
    budget -= blob.size;
    if (extname(path) === ".css" && depth < 3) {
      const css = await inlineCss(await blob.text(), path, depth + 1);
      return toDataUrl(new Blob([css]), path);
    }
    return toDataUrl(blob, path);
  };

  const inlineCss = async (css: string, cssPath: string, depth: number): Promise<string> => {
    const imported = await replaceAsync(css, CSS_IMPORT, async (m) => {
      const data = await embed(cssPath, m[2]!, depth);
      return data ? `@import "${data}"` : m[0];
    });
    return replaceAsync(imported, CSS_URL, async (m) => {
      const data = await embed(cssPath, m[2]!, depth);
      return data ? `url("${data}")` : m[0];
    });
  };

  let out = html.replace(/\ssrcset=(["'])[^"']*\1/gi, "");
  out = await replaceAsync(out, HTML_ATTR, async (m) => {
    const [whole, head, attr, quote, url] = m as unknown as [
      string,
      string,
      string,
      string,
      string,
    ];
    if (
      head.toLowerCase().startsWith("<link") &&
      !/\brel=(["'])?[^>]*\b(stylesheet|icon)\b/i.test(head + whole)
    ) {
      return whole;
    }
    const data = await embed(docPath, url);
    return data ? `${head}${attr}=${quote}${data}${quote}` : whole;
  });
  out = await replaceAsync(
    out,
    STYLE_BLOCK,
    async (m) => `${m[1]}${await inlineCss(m[2]!, docPath, 1)}${m[3]}`,
  );
  out = await replaceAsync(out, STYLE_ATTR, async (m) => {
    const doubleQuoted = m[2] !== undefined;
    const css = await inlineCss((m[2] ?? m[3] ?? "").replace(/&quot;/g, '"'), docPath, 1);
    // Data URLs are quoted with " by inlineCss; keep the attribute's own quotes intact.
    return doubleQuoted ? `${m[1]}"${css.replace(/"/g, "'")}"` : `${m[1]}'${css}'`;
  });
  return out;
}

/** True when the markup contains a script element or an inline event handler. */
export function hasScripts(html: string): boolean {
  return /<script\b/i.test(html) || /<[a-z][^>]*\son[a-z]+\s*=/i.test(html);
}

/**
 * Scripts mode runs in an opaque origin, where `localStorage`,
 * `sessionStorage` and `document.cookie` throw. Many documentation scripts
 * only use them to remember a toggle, and fail entirely when they throw.
 * This shim, run before any document script, swaps them for in-memory
 * versions that last as long as the page: nothing is shared or persisted.
 */
const STORAGE_SHIM = `<script>(function () {
  function memoryStorage() {
    var m = new Map();
    return {
      get length() { return m.size; },
      key: function (i) { var k = Array.from(m.keys())[i]; return k === undefined ? null : k; },
      getItem: function (k) { k = String(k); return m.has(k) ? m.get(k) : null; },
      setItem: function (k, v) { m.set(String(k), String(v)); },
      removeItem: function (k) { m.delete(String(k)); },
      clear: function () { m.clear(); }
    };
  }
  ["localStorage", "sessionStorage"].forEach(function (name) {
    try { window[name]; } catch (e) {
      Object.defineProperty(window, name, { value: memoryStorage(), configurable: true });
    }
  });
  try { document.cookie; } catch (e) {
    var jar = new Map();
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: function () { return Array.from(jar, function (p) { return p[0] + "=" + p[1]; }).join("; "); },
      set: function (v) { var kv = String(v).split(";")[0]; var i = kv.indexOf("="); if (i > 0) jar.set(kv.slice(0, i).trim(), kv.slice(i + 1)); }
    });
  }
})();</script>`;

/** Inserts `markup` at the start of `<head>` (or of the document, after the doctype). */
function insertAtHead(html: string, markup: string): string {
  const head = /<head\b[^>]*>/i.exec(html);
  if (head) {
    const at = head.index + head[0].length;
    return html.slice(0, at) + markup + html.slice(at);
  }
  const doctype = /^\s*<!doctype[^>]*>/i.exec(html);
  const at = doctype ? doctype[0].length : 0;
  return html.slice(0, at) + markup + html.slice(at);
}

/** Inserts the storage shim at the start of `<head>` (or of the document). */
export function injectStorageShim(html: string): string {
  return insertAtHead(html, STORAGE_SHIM);
}

/** Where the design system for documents is served (see `src/styles/doc.css`). */
export const THEME_HREF = "/lectern-doc.css";

const THEME_META =
  /<meta\b(?=[^>]*\bname=(["'])lectern-theme\1)(?=[^>]*\bcontent=(["'])on\2)[^>]*>/i;

/** A document asks for Lectern's design system with `<meta name="lectern-theme" content="on">`. */
export function wantsTheme(html: string): boolean {
  return THEME_META.test(html);
}

/**
 * Links the design system first in `<head>`, so the document's own styles
 * come later and win. Nothing else changes: a document that does not opt in
 * is served as it is.
 */
export function injectTheme(html: string): string {
  if (!wantsTheme(html)) return html;
  return insertAtHead(html, `<link rel="stylesheet" href="${THEME_HREF}">`);
}
