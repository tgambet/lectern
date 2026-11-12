/** Messages between the service worker and an app window that reads a file for it. */
export const RELAY_MESSAGE = "lectern:read-file";

export interface RelayRequest {
  type: typeof RELAY_MESSAGE;
  folderId: string;
  path: string;
}

export type RelayReply = { ok: true; blob: Blob } | { ok: false; error: string };
