// File System Access API members missing from TypeScript's DOM lib (Chromium-only).
// Declared as methods so they merge as overloads if the lib gains them.
interface FileSystemHandlePermissionDescriptor {
  mode?: "read" | "readwrite";
}

interface FileSystemHandle {
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>;
}

interface DirectoryPickerOptions {
  id?: string;
  mode?: "read";
  startIn?: FileSystemHandle | "desktop" | "documents" | "downloads";
}

interface Window {
  showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
}

// FileSystemObserver (Chromium): change records for a watched handle.
interface FileSystemChangeRecord {
  readonly type: "appeared" | "disappeared" | "modified" | "moved" | "unknown" | "errored";
  readonly relativePathComponents: readonly string[];
  readonly relativePathMovedFrom: readonly string[] | null;
}

declare class FileSystemObserver {
  constructor(callback: (records: FileSystemChangeRecord[], observer: FileSystemObserver) => void);
  observe(handle: FileSystemHandle, options?: { recursive?: boolean }): Promise<void>;
  disconnect(): void;
}
