// Guards the read-only promise: no app source may ask for write access or call a write API.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vite-plus/test";

// `readwrite` only as a file-system permission mode; IndexedDB transactions use the same word.
const forbidden = [
  /mode:\s*["']readwrite["']/,
  /createWritable/,
  /removeEntry/,
  /\.move\(/,
  /createSyncAccessHandle/,
];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    // Type declarations describe the API surface; they do not call it.
    return /\.tsx?$/.test(name) && !name.endsWith(".d.ts") ? [path] : [];
  });
}

it("no app source requests write access to the folder", () => {
  const offences = sources("src").flatMap((file) => {
    const text = readFileSync(file, "utf8");
    return forbidden.filter((re) => re.test(text)).map((re) => `${file}: ${re}`);
  });
  expect(offences).toEqual([]);
});
