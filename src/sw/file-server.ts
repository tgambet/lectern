/**
 * Virtual file server (ADR 0006): answers `/~/<folderId>/<path>` by reading
 * the stored folder handle, or by asking an app window to read it. Every
 * document response carries the sandbox CSP of ADR 0005.
 */
import { FileSystemAccessFS } from "../fs/file-system-access-fs.ts";
import { isHtml, mimeType } from "../fs/mime.ts";
import { normalizePath } from "../fs/path.ts";
import {
  injectStorageShim,
  injectTheme,
  inlineResources,
  svgObjectsToImages,
} from "../html/rewrite.ts";
import { getFolder } from "../storage/db.ts";
import { DOCUMENT_CSP, SCRIPTS_DOCUMENT_CSP, SCRIPTS_PARAM, SCRIPTS_VALUE } from "./policy.ts";
import { RELAY_MESSAGE, type RelayReply, type RelayRequest } from "./relay-protocol.ts";

declare const self: ServiceWorkerGlobalScope;

export const FILE_PREFIX = "/~/";

export function parseFileUrl(pathname: string): { folderId: string; path: string } | null {
  if (!pathname.startsWith(FILE_PREFIX)) return null;
  const [folderId, ...rest] = pathname.slice(FILE_PREFIX.length).split("/");
  if (!folderId) return null;
  try {
    return { folderId, path: normalizePath(rest.map(decodeURIComponent).join("/")) };
  } catch {
    return null;
  }
}

async function readDirect(folderId: string, path: string): Promise<Blob> {
  const record = await getFolder(folderId);
  if (!record) throw new Error("unknown folder");
  return FileSystemAccessFS.fromStored(record.root).readBlob(path);
}

async function readViaWindow(folderId: string, path: string): Promise<Blob> {
  const windows = await self.clients.matchAll({ type: "window" });
  const app = windows.find(
    (c) => c.frameType === "top-level" && !new URL(c.url).pathname.startsWith(FILE_PREFIX),
  );
  if (!app) throw new Error("no app window");
  const { port1, port2 } = new MessageChannel();
  const reply = new Promise<Blob>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("relay timeout")), 5000);
    port1.onmessage = (event: MessageEvent<RelayReply>) => {
      clearTimeout(timer);
      if (event.data.ok) resolve(event.data.blob);
      else reject(new Error(event.data.error));
    };
  });
  const request: RelayRequest = { type: RELAY_MESSAGE, folderId, path };
  app.postMessage(request, [port2]);
  return reply;
}

export type DocumentMode = "default" | "scripts";

export function headersFor(path: string, mode: DocumentMode = "default"): Headers {
  const headers = new Headers({
    "Content-Type": mimeType(path),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  if (isHtml(path)) {
    headers.set(
      "Content-Security-Policy",
      mode === "scripts" ? SCRIPTS_DOCUMENT_CSP : DOCUMENT_CSP,
    );
  }
  return headers;
}

async function readFile(folderId: string, path: string): Promise<Blob> {
  try {
    return await readDirect(folderId, path);
  } catch {
    return readViaWindow(folderId, path);
  }
}

export async function serveFile(url: URL): Promise<Response> {
  const target = parseFileUrl(url.pathname);
  if (!target) return new Response("Not found", { status: 404 });
  const { folderId, path } = target;
  let body: Blob;
  try {
    body = await readFile(folderId, path);
  } catch {
    return new Response("Not found", { status: 404, headers: headersFor("x.txt") });
  }
  if (!isHtml(path)) return new Response(body, { headers: headersFor(path) });

  const mode: DocumentMode =
    url.searchParams.get(SCRIPTS_PARAM) === SCRIPTS_VALUE ? "scripts" : "default";
  let html = svgObjectsToImages(await body.text());
  // Scripts mode allows only `data:` styles, so the linked design system cannot load there.
  if (mode === "default") html = injectTheme(html);
  if (mode === "scripts") {
    html = injectStorageShim(
      await inlineResources(html, path, (p) => readFile(folderId, p).catch(() => null)),
    );
  }
  return new Response(html, { headers: headersFor(path, mode) });
}
