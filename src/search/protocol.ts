import type { SearchResult } from "./indexer.ts";

export type ToWorker =
  | { type: "open"; folderId: string }
  | { type: "sync"; paths: string[] }
  | { type: "search"; id: number; query: string };

export type FromWorker =
  | { type: "ready"; documents: number }
  | { type: "progress"; done: number; total: number }
  | { type: "synced"; documents: number }
  | { type: "results"; id: number; results: SearchResult[] }
  | { type: "error"; message: string };
