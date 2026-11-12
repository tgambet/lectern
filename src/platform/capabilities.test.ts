import { describe, expect, it } from "vite-plus/test";
import { detectCapabilities, isSupported, missingCapabilities } from "./capabilities.ts";

const noop = () => {};

function chromeLike() {
  return {
    showDirectoryPicker: noop,
    FileSystemHandle: { prototype: { queryPermission: noop, requestPermission: noop } },
    indexedDB: {},
    Worker: noop,
    navigator: { serviceWorker: {}, storage: { persist: noop } },
  };
}

describe("detectCapabilities", () => {
  it("detects a Chromium-like scope as supported", () => {
    const caps = detectCapabilities(chromeLike());
    expect(caps).toMatchObject({
      hasDirectoryPicker: true,
      hasHandlePermissions: true,
      hasServiceWorker: true,
      hasIndexedDB: true,
      hasWorker: true,
      hasPersistentStorage: true,
      hasFileSystemObserver: false,
    });
    expect(isSupported(caps)).toBe(true);
  });

  it("reports what a browser without the File System Access API lacks", () => {
    const { showDirectoryPicker: _, FileSystemHandle: __, ...scope } = chromeLike();
    const caps = detectCapabilities(scope);
    expect(isSupported(caps)).toBe(false);
    expect(missingCapabilities(caps)).toEqual(["hasDirectoryPicker", "hasHandlePermissions"]);
  });

  it("treats a handle without permission methods as unsupported", () => {
    const caps = detectCapabilities({ ...chromeLike(), FileSystemHandle: { prototype: {} } });
    expect(missingCapabilities(caps)).toEqual(["hasHandlePermissions"]);
  });

  it("does not require optional capabilities", () => {
    const caps = detectCapabilities({ ...chromeLike(), navigator: { serviceWorker: {} } });
    expect(caps.hasPersistentStorage).toBe(false);
    expect(isSupported(caps)).toBe(true);
  });

  it("survives an empty scope", () => {
    expect(isSupported(detectCapabilities({}))).toBe(false);
  });
});
