import { signal } from "@preact/signals";

/** Documents whose scripts the reader turned on, for this session only. */
export const scriptsOn = signal<ReadonlySet<string>>(new Set());

const key = (folderId: string, path: string) => `${folderId}\n${path}`;

export function areScriptsOn(folderId: string, path: string): boolean {
  return scriptsOn.value.has(key(folderId, path));
}

export function setScripts(folderId: string, path: string, on: boolean): void {
  const next = new Set(scriptsOn.value);
  if (on) next.add(key(folderId, path));
  else next.delete(key(folderId, path));
  scriptsOn.value = next;
}
