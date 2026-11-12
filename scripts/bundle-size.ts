// Prints the size of every built asset, raw and gzipped, plus the initial JS total.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const dist = "dist";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} kB`;
const rows = walk(dist)
  .filter((file) => /\.(js|css|html|woff2|svg|png|ico|webmanifest)$/.test(file))
  .map((file) => {
    const bytes = readFileSync(file);
    return { file: relative(dist, file), raw: bytes.length, gzip: gzipSync(bytes).length };
  })
  .sort((a, b) => b.gzip - a.gzip);

const width = Math.max(...rows.map((r) => r.file.length));
for (const r of rows)
  console.log(`${r.file.padEnd(width)}  ${kb(r.raw).padStart(10)}  ${kb(r.gzip).padStart(10)} gz`);

const html = readFileSync(join(dist, "index.html"), "utf8");
const initial = [...html.matchAll(/src="\/(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
const initialGzip = rows
  .filter((r) => initial.includes(r.file))
  .reduce((sum, r) => sum + r.gzip, 0);
console.log(`\nInitial JS (gzip): ${kb(initialGzip)}`);
