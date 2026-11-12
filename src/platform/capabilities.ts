/**
 * Every browser feature check lives here. Feature detection only: never read
 * the user agent. Each flag is a one-liner on purpose; if a check grows, it
 * probably belongs in the module that uses the feature.
 */
export interface Capabilities {
  /** `window.showDirectoryPicker`: opening a local folder (File System Access API). */
  hasDirectoryPicker: boolean;
  /** `FileSystemHandle.prototype.queryPermission`: resuming a stored folder handle. */
  hasHandlePermissions: boolean;
  hasServiceWorker: boolean;
  hasIndexedDB: boolean;
  hasWorker: boolean;
  /** `navigator.storage.persist`: asking the browser not to evict our data. */
  hasPersistentStorage: boolean;
  /** `FileSystemObserver`: live reload; without it the folder is re-read on focus. */
  hasFileSystemObserver: boolean;
}

type Scope = Record<string, unknown> & { navigator?: unknown };

function has(target: unknown, key: string): boolean {
  return target != null && typeof (target as Record<string, unknown>)[key] !== "undefined";
}

export function detectCapabilities(scope: Scope = globalThis as unknown as Scope): Capabilities {
  const nav = scope.navigator as Record<string, unknown> | undefined;
  const handle = scope.FileSystemHandle as { prototype?: unknown } | undefined;
  return {
    hasDirectoryPicker: typeof scope.showDirectoryPicker === "function",
    hasHandlePermissions: has(handle?.prototype, "queryPermission"),
    hasServiceWorker: has(nav, "serviceWorker"),
    hasIndexedDB: has(scope, "indexedDB"),
    hasWorker: typeof scope.Worker === "function",
    hasPersistentStorage: has(nav?.storage, "persist"),
    hasFileSystemObserver: typeof scope.FileSystemObserver === "function",
  };
}

/** Capabilities Lectern cannot run without in the MVP. */
const required = [
  "hasDirectoryPicker",
  "hasHandlePermissions",
  "hasServiceWorker",
  "hasIndexedDB",
  "hasWorker",
] as const satisfies ReadonlyArray<keyof Capabilities>;

export function missingCapabilities(caps: Capabilities): Array<keyof Capabilities> {
  return required.filter((key) => !caps[key]);
}

export function isSupported(caps: Capabilities): boolean {
  return missingCapabilities(caps).length === 0;
}

export const capabilities: Capabilities = detectCapabilities();
