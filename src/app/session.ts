/**
 * Which folder is open, and how we got there (ADR 0007): open directly when
 * permission is granted, otherwise one click on the resume card.
 */
import { signal } from "@preact/signals";
import { FileSystemAccessFS, type ReadPermission } from "../fs/file-system-access-fs.ts";
import { pickFolder } from "../fs/pick-folder.ts";
import type { VirtualFS } from "../fs/virtual-fs.ts";
import { isInstalledApp } from "../platform/display.ts";
import { persistStorage } from "./pwa.ts";
import {
  deleteFolder,
  getFolder,
  listFolders,
  putFolder,
  updateFolder,
  type FolderRecord,
} from "../storage/db.ts";
import { navigate } from "./router.ts";

export type Session =
  | { kind: "loading" }
  | { kind: "home" }
  | { kind: "resume"; record: FolderRecord; permission: Exclude<ReadPermission, "granted"> }
  | {
      kind: "reading";
      record: FolderRecord;
      fs: VirtualFS;
      /** Opened by itself as the page loaded, not by something the reader just did. */
      onLoad?: boolean;
    };

export const session = signal<Session>({ kind: "loading" });

async function open(record: FolderRecord, fs: VirtualFS, onLoad = false): Promise<void> {
  const opened = { ...record, openedAt: Date.now() };
  await updateFolder(record.id, { openedAt: opened.openedAt });
  void persistStorage();
  session.value = { kind: "reading", record: opened, fs, onLoad };
}

export async function startSession(): Promise<void> {
  const [last] = await listFolders();
  if (!last) {
    session.value = { kind: "home" };
    return;
  }
  const fs = FileSystemAccessFS.fromStored(last.root);
  let permission = await fs.queryPermission();
  if (permission === "prompt" && isInstalledApp()) {
    // The installed app may re-grant without a prompt; without that, this throws.
    permission = await fs.requestPermission().catch(() => permission);
  }
  if (permission === "granted") return open(last, fs, true);
  session.value = { kind: "resume", record: last, permission };
}

/** The resume card's primary action. Must run inside the click handler. */
export async function resume(): Promise<void> {
  const current = session.value;
  if (current.kind !== "resume") return;
  const fs = FileSystemAccessFS.fromStored(current.record.root);
  const permission = await fs.requestPermission();
  if (permission === "granted") return open(current.record, fs);
  session.value = { ...current, permission };
}

/**
 * Switch to a folder Lectern already knows, without the picker. Must run inside
 * the click handler: when permission lapsed, the browser prompt needs the gesture.
 */
export async function openKnown(id: string): Promise<void> {
  const record = await getFolder(id);
  if (!record) return;
  const fs = FileSystemAccessFS.fromStored(record.root);
  const permission = await fs.requestPermission().catch(() => "denied" as const);
  navigate("/", { replace: true });
  if (permission === "granted") return open(record, fs);
  session.value = { kind: "resume", record, permission };
}

/** Back to the home screen, where known folders and the demo are listed. */
export function closeFolder(): void {
  navigate("/", { replace: true });
  document.title = "Lectern";
  session.value = { kind: "home" };
}

/** Remove a folder from Lectern's memory. The folder on disk is not touched. */
export async function forgetFolder(id: string): Promise<void> {
  await deleteFolder(id);
  const current = session.value;
  if (current.kind === "resume" && current.record.id === id) session.value = { kind: "home" };
}

export async function openAnotherFolder(): Promise<void> {
  const fs = await pickFolder();
  if (!fs) return;
  for (const record of await listFolders()) {
    if (await fs.isSameRoot(record.root)) return open(record, fs);
  }
  const now = Date.now();
  const record: FolderRecord = {
    id: crypto.randomUUID(),
    name: fs.name,
    root: fs.toStored(),
    addedAt: now,
    openedAt: now,
    docCount: null,
    lastFile: null,
    lastScroll: 0,
  };
  await putFolder(record);
  await open(record, fs);
}

/** The built-in demo folder: in memory, never stored, nothing to authorize. */
export async function openDemo(): Promise<void> {
  const { DEMO_ID, DEMO_NAME, loadDemo } = await import("../demo/demo.ts");
  const now = Date.now();
  session.value = {
    kind: "reading",
    fs: await loadDemo(),
    record: {
      id: DEMO_ID,
      name: DEMO_NAME,
      root: null as unknown as FolderRecord["root"],
      addedAt: now,
      openedAt: now,
      docCount: null,
      lastFile: null,
      lastScroll: 0,
    },
  };
}
