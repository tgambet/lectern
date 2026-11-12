import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite-plus";
import { brandWebAssets } from "./brand.ts";

/**
 * Content-Security-Policy for the app shell. Injected at build time only:
 * the dev server needs inline styles and a websocket for HMR.
 * `connect-src 'none'`: the app itself never makes a network request.
 */
export const appCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'none'",
  "worker-src 'self'",
  "frame-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "require-trusted-types-for 'script'",
  "trusted-types default",
].join("; ");

export function csp(): Plugin {
  return {
    name: "lectern:csp",
    apply: "build",
    // Replaces the `<!-- csp -->` marker right after `<meta charset>`, ahead of every script.
    transformIndexHtml: (html) => {
      if (!html.includes("<!-- csp -->"))
        throw new Error("index.html lacks the <!-- csp --> marker");
      return html.replace(
        "<!-- csp -->",
        `<meta http-equiv="Content-Security-Policy" content="${appCsp}" />`,
      );
    },
  };
}

/** `theme-color` per scheme, so the installed window's title bar matches the paper. */
export function themeColor(paper: { light: string; dark: string }): Plugin {
  return {
    name: "lectern:theme-color",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: {
          name: "theme-color",
          content: paper.light,
          media: "(prefers-color-scheme: light)",
        },
        injectTo: "head",
      },
      {
        tag: "meta",
        attrs: { name: "theme-color", content: paper.dark, media: "(prefers-color-scheme: dark)" },
        injectTo: "head",
      },
    ],
  };
}

const mimeByExt: Record<string, string> = {
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

/** Serves the brand's favicons and PWA icons at the site root. */
export function brandAssets(): Plugin {
  const brand = brandWebAssets;
  const files = [
    brand.favicon.ico,
    brand.favicon.svg,
    brand.appleTouchIcon,
    brand.icon192,
    brand.icon512,
    brand.maskable512,
  ];
  const read = (file: string) => readFileSync(join(process.cwd(), brand.dir, file));

  return {
    name: "lectern:brand-assets",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = files.find((f) => req.url === `/${f}`);
        if (!file) return next();
        const ext = file.slice(file.lastIndexOf("."));
        res.setHeader("Content-Type", mimeByExt[ext] ?? "application/octet-stream");
        res.end(read(file));
      });
    },
    generateBundle() {
      for (const file of files) {
        this.emitFile({ type: "asset", fileName: file, source: read(file) });
      }
    },
    transformIndexHtml: () =>
      [
        { rel: "icon", href: `/${brand.favicon.ico}`, sizes: "48x48" },
        { rel: "icon", href: `/${brand.favicon.svg}`, type: "image/svg+xml" },
        { rel: "apple-touch-icon", href: `/${brand.appleTouchIcon}` },
      ].map((attrs) => ({ tag: "link", attrs, injectTo: "head" as const })),
  };
}

/**
 * Workers have no `document`. Some packages pick a DOM implementation under
 * the `browser` condition (decode-named-character-reference, used by
 * micromark); in worker bundles, prefer their `worker` export instead.
 */
export function workerConditions(): Plugin {
  return {
    name: "lectern:worker-conditions",
    // Before Vite's own resolver, which would otherwise answer first.
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (source !== "decode-named-character-reference") return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      return resolved
        ? { ...resolved, id: resolved.id.replace(/index\.dom\.js$/, "index.js") }
        : null;
    },
  };
}
