import { FileSystemAccessFS } from "./file-system-access-fs.ts";

/** Shows the folder picker in read mode. `null` when the person dismisses it. */
export async function pickFolder(): Promise<FileSystemAccessFS | null> {
  try {
    const handle = await window.showDirectoryPicker({ id: "lectern", mode: "read" });
    return FileSystemAccessFS.fromPicker(handle);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null;
    throw error;
  }
}
