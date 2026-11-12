import { signal } from "@preact/signals";
import type { SearchResult } from "./indexer.ts";
import type { FromWorker, ToWorker } from "./protocol.ts";

export interface SearchStatus {
  /** Documents the index can answer for right now. */
  documents: number;
  /** While indexing: progress through the folder's documents. */
  progress: { done: number; total: number } | null;
}

/** Talks to the search worker of one folder. */
export class SearchClient {
  readonly status = signal<SearchStatus>({ documents: 0, progress: null });
  readonly #worker: Worker;
  readonly #pending = new Map<number, (results: SearchResult[]) => void>();
  #next = 0;

  constructor(folderId: string) {
    this.#worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
      name: "search",
    });
    this.#worker.addEventListener("message", (event: MessageEvent<FromWorker>) =>
      this.#receive(event.data),
    );
    this.#send({ type: "open", folderId });
  }

  #send(message: ToWorker) {
    this.#worker.postMessage(message);
  }

  #receive(message: FromWorker) {
    switch (message.type) {
      case "ready":
        this.status.value = { ...this.status.value, documents: message.documents };
        break;
      case "progress":
        this.status.value = {
          ...this.status.value,
          progress: { done: message.done, total: message.total },
        };
        break;
      case "synced":
        this.status.value = { documents: message.documents, progress: null };
        break;
      case "results":
        this.#pending.get(message.id)?.(message.results);
        this.#pending.delete(message.id);
        break;
      case "error":
        console.warn("search:", message.message);
    }
  }

  /** Re-index against the folder's current document list (only changed files are read). */
  sync(paths: string[]): void {
    this.#send({ type: "sync", paths });
  }

  search(query: string): Promise<SearchResult[]> {
    const id = this.#next++;
    return new Promise((resolve) => {
      this.#pending.set(id, resolve);
      this.#send({ type: "search", id, query });
    });
  }

  dispose(): void {
    this.#worker.terminate();
    for (const resolve of this.#pending.values()) resolve([]);
    this.#pending.clear();
  }
}
