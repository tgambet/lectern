import { DEMO_ID, loadDemo } from "../demo/demo.ts";
import { FileSystemAccessFS } from "../fs/file-system-access-fs.ts";
import { getFolder } from "../storage/db.ts";
import { RELAY_MESSAGE, type RelayReply, type RelayRequest } from "../sw/relay-protocol.ts";

/** Reads files for the service worker when it cannot read the folder itself (ADR 0006). */
export function startFileRelay(): void {
  navigator.serviceWorker?.addEventListener("message", (event: MessageEvent<RelayRequest>) => {
    if (event.data?.type !== RELAY_MESSAGE) return;
    const port = event.ports[0];
    if (!port) return;
    const { folderId, path } = event.data;
    void (async (): Promise<RelayReply> => {
      try {
        if (folderId === DEMO_ID)
          return { ok: true, blob: await (await loadDemo()).readBlob(path) };
        const record = await getFolder(folderId);
        if (!record) return { ok: false, error: "unknown folder" };
        return { ok: true, blob: await FileSystemAccessFS.fromStored(record.root).readBlob(path) };
      } catch (error) {
        return { ok: false, error: String(error) };
      }
    })().then((reply) => port.postMessage(reply));
  });
}
