/**
 * Search worker: owns the index, reads documents through the folder handle
 * (from IndexedDB), and answers queries while indexing.
 */
import { DEMO_ID, loadDemo } from "../demo/demo.ts";
import { FileSystemAccessFS } from "../fs/file-system-access-fs.ts";
import type { VirtualFS } from "../fs/virtual-fs.ts";
import { getFolder } from "../storage/db.ts";
import { IdbSearchStore } from "./idb-store.ts";
import { Indexer } from "./indexer.ts";
import type { FromWorker, ToWorker } from "./protocol.ts";

const post = (message: FromWorker) =>
  (self as unknown as { postMessage(m: FromWorker): void }).postMessage(message);

let indexer: Indexer | null = null;
let opening: Promise<void> | null = null;
let syncing: AbortController | null = null;

async function folderFs(folderId: string): Promise<VirtualFS> {
  if (folderId === DEMO_ID) return loadDemo();
  const record = await getFolder(folderId);
  if (!record) throw new Error("unknown folder");
  return FileSystemAccessFS.fromStored(record.root);
}

async function open(folderId: string): Promise<void> {
  indexer = new Indexer(await folderFs(folderId), folderId, new IdbSearchStore());
  post({ type: "ready", documents: await indexer.open() });
}

addEventListener("message", (event: MessageEvent<ToWorker>) => {
  const message = event.data;
  void (async () => {
    try {
      if (message.type === "open") {
        opening = open(message.folderId);
        await opening;
        return;
      }
      await opening;
      if (!indexer) return;
      if (message.type === "sync") {
        syncing?.abort();
        const controller = new AbortController();
        syncing = controller;
        await indexer.sync(
          message.paths,
          (p) => post({ type: "progress", ...p }),
          controller.signal,
        );
        if (!controller.signal.aborted) post({ type: "synced", documents: indexer.documentCount });
      } else if (message.type === "search") {
        post({ type: "results", id: message.id, results: await indexer.search(message.query) });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      post({ type: "error", message: error instanceof Error ? error.message : String(error) });
    }
  })();
});
