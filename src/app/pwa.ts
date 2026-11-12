/** Service worker updates, the install prompt and persistent storage. */
import { signal } from "@preact/signals";
import { registerSW } from "virtual:pwa-register";
import { capabilities } from "../platform/capabilities.ts";

/** A new version is installed and waiting; `applyUpdate()` switches to it. */
export const updateReady = signal(false);
let update: ((reload?: boolean) => Promise<void>) | null = null;

export function startServiceWorker(): void {
  if (!capabilities.hasServiceWorker) return;
  update = registerSW({
    immediate: true,
    onNeedRefresh: () => (updateReady.value = true),
  });
}

export function applyUpdate(): void {
  void update?.(true);
}

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** The browser's install prompt, when it offers one. */
export const installPrompt = signal<InstallPromptEvent | null>(null);

export function startInstallPrompt(): void {
  addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt.value = event as InstallPromptEvent;
  });
  addEventListener("appinstalled", () => (installPrompt.value = null));
}

export async function install(): Promise<void> {
  const prompt = installPrompt.value;
  if (!prompt) return;
  await prompt.prompt();
  if ((await prompt.userChoice).outcome === "accepted") installPrompt.value = null;
}

/**
 * Asks the browser not to evict our storage (folder handles, search index).
 * Chrome decides silently from engagement and installation; no prompt.
 */
export async function persistStorage(): Promise<void> {
  if (!capabilities.hasPersistentStorage) return;
  try {
    if (!(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    // Refused: storage stays best-effort.
  }
}
