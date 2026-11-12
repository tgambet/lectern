/**
 * The built-in demo folder: a MemoryFS over files bundled with the app
 * (`content/`), so Lectern can be tried without picking a folder. Loaded on
 * demand, by the app and by the search worker.
 */
import { MemoryFS } from "../fs/memory-fs.ts";

export const DEMO_ID = "demo";
export const DEMO_NAME = "Lectern demo";

const files = import.meta.glob<string>("./content/**/*", { query: "?raw", import: "default" });

let demo: Promise<MemoryFS> | null = null;

export function loadDemo(): Promise<MemoryFS> {
  demo ??= (async () => {
    const entries = await Promise.all(
      Object.entries(files).map(
        async ([path, load]) => [path.slice("./content/".length), await load()] as const,
      ),
    );
    return new MemoryFS(DEMO_NAME, Object.fromEntries(entries));
  })();
  return demo;
}
