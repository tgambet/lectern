/** Where the search index lives between sessions. IndexedDB in the app, memory in tests. */
export interface DocMeta {
  size: number;
  lastModified: number;
  title: string;
}

export interface StoredIndex {
  version: number;
  /** MiniSearch's JSON serialization. */
  index: string;
  docs: Record<string, DocMeta>;
}

export interface SearchStore {
  load(folderId: string): Promise<StoredIndex | null>;
  save(folderId: string, stored: StoredIndex): Promise<void>;
  getText(folderId: string, path: string): Promise<string | null>;
  putTexts(folderId: string, entries: Array<{ path: string; text: string }>): Promise<void>;
  deleteTexts(folderId: string, paths: string[]): Promise<void>;
}

export class MemorySearchStore implements SearchStore {
  readonly indexes = new Map<string, StoredIndex>();
  readonly texts = new Map<string, string>();

  async load(folderId: string) {
    return this.indexes.get(folderId) ?? null;
  }
  async save(folderId: string, stored: StoredIndex) {
    this.indexes.set(folderId, stored);
  }
  async getText(folderId: string, path: string) {
    return this.texts.get(`${folderId}\n${path}`) ?? null;
  }
  async putTexts(folderId: string, entries: Array<{ path: string; text: string }>) {
    for (const { path, text } of entries) this.texts.set(`${folderId}\n${path}`, text);
  }
  async deleteTexts(folderId: string, paths: string[]) {
    for (const path of paths) this.texts.delete(`${folderId}\n${path}`);
  }
}
