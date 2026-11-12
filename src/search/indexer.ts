/**
 * Full-text index of a folder's documents (MiniSearch), kept incrementally:
 * a document is re-read only when its size or modification time changed.
 * Title, path, headings and body are separate fields, weighted 3/2/2/1, so
 * file and folder names are found too. Runs in the
 * search worker; tested here with MemoryFS.
 */
import MiniSearch, { type Options, type SearchResult as MiniResult } from "minisearch";
import type { VirtualFS } from "../fs/virtual-fs.ts";
import { documentKind } from "../tree/documents.ts";
import { extractText } from "./extract.ts";
import { markMatches, snippet, type SnippetPart } from "./snippet.ts";
import type { DocMeta, SearchStore } from "./store.ts";

/** Bump when fields or tokenization change: stored indexes are then rebuilt. */
export const INDEX_VERSION = 3;
/** Documents larger than this are listed by title only. */
export const MAX_INDEXED_BYTES = 2 * 1024 * 1024;

interface IndexedDoc {
  id: string;
  title: string;
  /** The document's path; the default tokenizer splits it on `/`, `.`, `-` and `_`. */
  path: string;
  headings: string;
  body: string;
}

const options: Options<IndexedDoc> = {
  fields: ["title", "path", "headings", "body"],
  storeFields: ["title"],
  searchOptions: {
    boost: { title: 3, path: 2, headings: 2 },
    prefix: (term: string) => term.length > 1,
    fuzzy: (term: string) => (term.length > 4 ? 0.2 : false),
    combineWith: "AND",
  },
};

export interface SearchResult {
  path: string;
  /** The path, with the terms it matched marked. */
  pathParts: SnippetPart[];
  title: string;
  snippet: SnippetPart[];
}

export interface SyncProgress {
  done: number;
  total: number;
}

export class Indexer {
  readonly #fs: VirtualFS;
  readonly #folderId: string;
  readonly #store: SearchStore;
  #search = new MiniSearch<IndexedDoc>(options);
  #docs: Record<string, DocMeta> = {};

  constructor(fs: VirtualFS, folderId: string, store: SearchStore) {
    this.#fs = fs;
    this.#folderId = folderId;
    this.#store = store;
  }

  /** Loads the stored index, if any and current, so search works before sync. */
  async open(): Promise<number> {
    const stored = await this.#store.load(this.#folderId);
    if (stored?.version === INDEX_VERSION) {
      this.#search = MiniSearch.loadJSON<IndexedDoc>(stored.index, options);
      this.#docs = stored.docs;
    }
    return Object.keys(this.#docs).length;
  }

  get documentCount(): number {
    return this.#search.documentCount;
  }

  async #persist(): Promise<void> {
    await this.#store.save(this.#folderId, {
      version: INDEX_VERSION,
      index: JSON.stringify(this.#search),
      docs: this.#docs,
    });
  }

  /**
   * Brings the index in line with `paths` (the folder's documents, from the
   * file index). Search keeps answering while this runs.
   */
  async sync(
    paths: string[],
    onProgress?: (progress: SyncProgress) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const wanted = new Set(paths.filter((p) => documentKind(p)));
    const removed = Object.keys(this.#docs).filter((p) => !wanted.has(p));
    for (const path of removed) {
      if (this.#search.has(path)) this.#search.discard(path);
      delete this.#docs[path];
    }
    if (removed.length) await this.#store.deleteTexts(this.#folderId, removed);

    const total = wanted.size;
    let done = 0;
    let dirty = removed.length > 0;
    let texts: Array<{ path: string; text: string }> = [];
    const flush = async () => {
      if (texts.length) await this.#store.putTexts(this.#folderId, texts);
      texts = [];
      if (dirty) await this.#persist();
      dirty = false;
    };

    for (const path of wanted) {
      signal?.throwIfAborted();
      try {
        const stat = await this.#fs.stat(path);
        const known = this.#docs[path];
        if (!known || known.size !== stat.size || known.lastModified !== stat.lastModified) {
          const source = stat.size <= MAX_INDEXED_BYTES ? await this.#fs.readText(path) : "";
          const text = extractText(documentKind(path)!, source, path);
          const doc = { id: path, path, ...text };
          if (this.#search.has(path)) this.#search.replace(doc);
          else this.#search.add(doc);
          this.#docs[path] = {
            size: stat.size,
            lastModified: stat.lastModified,
            title: text.title,
          };
          texts.push({ path, text: text.body });
          dirty = true;
        }
      } catch {
        // Unreadable now (moved, permission): keep what we had, try again next sync.
      }
      done++;
      if (done % 25 === 0 || done === total) {
        onProgress?.({ done, total });
        if (done % 200 === 0) await flush();
      }
    }
    await flush();
    onProgress?.({ done: total, total });
  }

  async search(query: string, limit = 20): Promise<SearchResult[]> {
    const q = query.trim();
    if (q === "") return [];
    const hits: MiniResult[] = this.#search.search(q).slice(0, limit);
    return Promise.all(
      hits.map(async (hit) => {
        const path = String(hit.id);
        const body = (await this.#store.getText(this.#folderId, path)) ?? "";
        const inPath = Object.keys(hit.match).filter((term) => hit.match[term]!.includes("path"));
        return {
          path,
          pathParts: markMatches(path, inPath),
          title: String(hit.title ?? path),
          snippet: snippet(body, [...hit.terms, ...hit.queryTerms]),
        };
      }),
    );
  }
}
